const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { exec } = require('child_process');
const path = require('path');

let mainWindow;

// Configurar logging
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
  dialog.showMessageBox({
    title: 'Actualización lista',
    message: 'La actualización se descargó. ¿Deseas reiniciar y aplicar la actualización ahora?',
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
    autoUpdater.checkForUpdates();
  }, 500);
});

ipcMain.handle('buscar-actualizaciones', async () => {
  autoUpdater.checkForUpdates();
});

ipcMain.handle('ejecutar-python', async () => {
  const pythonScript = path.join(__dirname, 'suma.py');

  return new Promise((resolve, reject) => {
    exec(`python "${pythonScript}"`, (error, stdout, stderr) => {
      if (error) {
        log.error('Error ejecutando Python:', error);
        dialog.showErrorBox('Error', 'No se pudo ejecutar el script de Python.');
        return reject(error);
      }

      const output = stdout.trim();
      log.info('✅ Resultado desde Python:', output);
      dialog.showMessageBox({
        type: 'info',
        title: 'Resultado desde Python',
        message: output || 'Sin resultado'
      });

      resolve(output);
    });
  });
});
