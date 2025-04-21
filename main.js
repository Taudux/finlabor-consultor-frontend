const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('🔧 Aplicación iniciada');

autoUpdater.autoDownload = false;

autoUpdater.on('checking-for-update', () => {
  log.info('🔄 Buscando actualizaciones...');
});

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
    }
  });
});

autoUpdater.on('update-not-available', () => {
  log.info('✅ No hay actualizaciones disponibles.');
});

autoUpdater.on('error', (err) => {
  log.error('❌ Error en autoUpdater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`📥 Descargando... ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', () => {
  log.info('✅ Actualización descargada.');
  dialog.showMessageBox({
    title: 'Actualización lista',
    message: '¿Deseas reiniciar para aplicar la actualización?',
    buttons: ['Sí', 'Más tarde']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setTimeout(() => {
    log.info('🟢 Buscando actualizaciones al iniciar...');
    autoUpdater.checkForUpdates();
  }, 500);
});

ipcMain.handle('buscar-actualizaciones', async () => {
  log.info('📎 Búsqueda manual de actualizaciones activada.');
  autoUpdater.checkForUpdates();
});

ipcMain.handle('run-python-script', async () => {
  const python = spawn('python', [path.join(__dirname, 'suma.py')]);

  let result = '';
  python.stdout.on('data', (data) => {
    result += data.toString();
  });

  python.stderr.on('data', (data) => {
    log.error(`❌ Error del script Python: ${data}`);
  });

  python.on('close', () => {
    log.info(`✅ Resultado del script: ${result}`);
    dialog.showMessageBox({
      title: 'Resultado desde Python',
      message: result
    });
  });
});
