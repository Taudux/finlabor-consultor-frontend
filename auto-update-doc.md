# Documentación de Actualización Automática en Aplicación Electron

## Objetivo
Implementar actualizaciones automáticas en una aplicación de escritorio desarrollada con Electron y publicadas a través de GitHub Releases, utilizando `electron-builder` y `electron-updater`.

---

## Estructura del proyecto
- Empaquetador: `electron-builder`
- Mecanismo de actualización: `electron-updater`
- Plataforma de publicación: GitHub
- Repositorio: [YaelPerez/electron_prueba_1](https://github.com/YaelPerez/electron_prueba_1)

---

## Configuración en `package.json`
```json
"build": {
  "appId": "com.tuempresa.miapp",
  "publish": [
    {
      "provider": "github",
      "owner": "YaelPerez",
      "repo": "electron_prueba_1"
    }
  ],
  "win": {
    "target": "nsis",
    "artifactName": "${productName}-Setup-${version}.${ext}"
  }
}
```

---

## Configuración en `main.js`
```js
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
    if (result.response === 0) autoUpdater.downloadUpdate();
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
    message: 'La actualización se descargó. ¿Deseas reiniciar ahora?',
    buttons: ['Sí', 'Más tarde']
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => { mainWindow = null });
}

const feedURL = 'https://github.com/YaelPerez/electron_prueba_1/releases/latest/download/latest.yml';

app.whenReady().then(() => {
  createWindow();
  autoUpdater.setFeedURL({ url: feedURL });
  setTimeout(() => autoUpdater.checkForUpdates(), 500);
});

ipcMain.handle('buscar-actualizaciones', async () => {
  autoUpdater.checkForUpdates();
});
```

---

## Buenas prácticas y notas importantes

- **El repositorio debe ser público** para que las URLs de descarga funcionen sin token.
- El nombre del ejecutable generado debe coincidir con el que se publica en GitHub:
  ```json
  "artifactName": "${productName}-Setup-${version}.${ext}"
  ```
- La versión en `package.json` debe coincidir con la versión publicada en el release de GitHub.
- Asegúrate de subir **`latest.yml`**, el **.exe** y el **.blockmap** al release.

---

## Flujo final validado (ejemplo)

- Instalada versión 1.0.8
- Publicada versión 1.0.9 en GitHub Releases
- Al abrir la aplicación:
  - Detecta nueva versión
  - Ofrece descargarla
  - Descarga exitosa
  - Se instala y reinicia correctamente

✅ **Actualizaciones funcionando al 100%**

---

## ¡Listo!
Esto queda como referencia completa para futuras apps con `autoUpdater`.

---

