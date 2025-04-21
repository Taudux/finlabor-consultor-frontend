const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

// Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('🔧 Aplicación iniciada');
autoUpdater.autoDownload = false;

autoUpdater.on('checking-for-update', () => log.info('🔄 Buscando actualizaciones...'));
autoUpdater.on('update-available', (info) => {
  log.info('📦 Actualización disponible:', info);
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización disponible',
    message: 'Hay una nueva versión disponible. ¿Quieres descargarla ahora?',
    buttons: ['Sí', 'No']
  }).then(result => {
    if (result.response === 0) {
      log.info('⬇️ Iniciando descarga de la actualización...');
      autoUpdater.downloadUpdate();
    } else {
      log.info('⏩ Usuario rechazó la actualización por ahora.');
    }
  });
});
autoUpdater.on('update-not-available', () => log.info('✅ No hay actualizaciones disponibles.'));
autoUpdater.on('error', err => log.error('❌ Error en autoUpdater:', err));
autoUpdater.on('download-progress', progress => log.info(`📥 Descargando... ${Math.round(progress.percent)}%`));
autoUpdater.on('update-downloaded', () => {
  log.info('✅ Actualización descargada.');
  dialog.showMessageBox({
    title: 'Actualización lista',
    message: 'La actualización se descargó. ¿Deseas reiniciar y aplicar la actualización ahora?',
    buttons: ['Sí', 'Más tarde']
  }).then(result => {
    if (result.response === 0) {
      log.info('🚀 Reiniciando para instalar la actualización...');
      autoUpdater.quitAndInstall();
    } else {
      log.info('🕒 Usuario decidió actualizar después.');
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => { mainWindow = null });
}

app.whenReady().then(() => {
  createWindow();

  setTimeout(() => {
    log.info('🟢 Buscando actualizaciones al iniciar...');
    autoUpdater.checkForUpdates();
  }, 500);
});

// 🔁 IPC para buscar actualizaciones
ipcMain.handle('buscar-actualizaciones', async () => {
  log.info('📎 Búsqueda manual de actualizaciones activada.');
  autoUpdater.checkForUpdates();
});

// ✅ IPC para ejecutar script Python
ipcMain.handle('runPythonScript', async () => {
  const pythonProcess = spawn('python', [path.join(__dirname, 'suma.py')]);

  let output = '';
  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    log.error('⚠️ Error en script Python:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    log.info(`🔚 Proceso Python finalizó con código ${code}`);
    if (output.trim()) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Resultado de Python',
        message: output.trim()
      });
    } else {
      dialog.showMessageBox({
        type: 'warning',
        title: 'Sin respuesta',
        message: 'El script no devolvió ninguna salida.'
      });
    }
  });
});
