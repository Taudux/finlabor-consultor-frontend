const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

let mainWindow;

// Configurar logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('🔧 Aplicación iniciada');

// Configurar autoUpdater
autoUpdater.autoDownload = false;

// Eventos del autoUpdater
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
    } else {
      log.info('⏩ Usuario rechazó la actualización por ahora.');
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
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
      preload: `${__dirname}/preload.js`,
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

// Búsqueda manual desde botón en la UI
ipcMain.handle('buscar-actualizaciones', async () => {
  log.info('📎 Búsqueda manual de actualizaciones activada.');
  autoUpdater.checkForUpdates();
});
