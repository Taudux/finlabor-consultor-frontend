const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');

  // Al iniciar, buscar actualizaciones
  autoUpdater.checkForUpdates();

  mainWindow.on('closed', () => mainWindow = null);
}

// Configura autoUpdater
autoUpdater.autoDownload = false;

autoUpdater.on('update-available', (info) => {
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

app.on('ready', createWindow);

// Permitir búsqueda manual desde el renderer
ipcMain.handle('buscar-actualizaciones', async () => {
  autoUpdater.checkForUpdates();
});
