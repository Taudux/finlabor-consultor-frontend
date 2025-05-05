const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;
const fs = require('fs');
const https = require('https');
const { fetch, FormData } = require('undici');
const { Blob } = require('buffer');  // Importa Blob de Node.js

let mainWindow;

// Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('🔧 Aplicación iniciada');
autoUpdater.autoDownload = false;

// Eventos autoUpdater
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
    width: 480,
    height: 700,
    minWidth: 320,
    minHeight: 500,
    resizable: true,
    icon: path.join(__dirname, 'assets', 'build/finlabor_logo-removebg-preview.png'), // ruta de icono
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenu(null); // OCULTA la barra de menú
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
  const scriptPath = isDev
    ? path.join(__dirname, 'python_scripts', 'suma.py')
    : path.join(process.resourcesPath, 'python_scripts', 'suma.py');

  const pythonProcess = spawn('python', [scriptPath]);

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

// IPC para descargar Excel
ipcMain.handle('generar-excel', async () => {
  const url = 'https://render-prueba-backend1.onrender.com/generar_excel';

  const savePath = dialog.showSaveDialogSync({
    title: 'Guardar archivo Excel',
    defaultPath: 'archivo_generado.xlsx',
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });

  if (!savePath) return { cancelado: true };

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(savePath, () => { });
        return reject(new Error(`HTTP status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve({ success: true });
      });
    }).on('error', (err) => {
      fs.unlink(savePath, () => { });
      reject(err);
    });
  }).catch((err) => {
    console.error('Error al descargar el archivo:', err);
    return { error: err.message };
  });
});

ipcMain.handle('select-excel-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const newFileName = `${base}_Consulta${ext}`;
    const outputPath = path.join(dir, newFileName);

    console.log('Archivo seleccionado:', filePath);
    // console.log('Archivo resultado:', outputPath);

    return { filePath, outputPath };
  }

  return null;
});

ipcMain.handle('guardar-archivo-procesado', async (event, outputFilePath, arrayBufferBase64) => {
  try {
    const buffer = Buffer.from(arrayBufferBase64, 'base64');
    fs.writeFileSync(outputFilePath, buffer);
    return { success: true };
  } catch (err) {
    console.error('Error guardando archivo procesado:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('procesar-archivo', async (event, { filePath, us, pw, pk, ak }) => {
  try {
    // const filePath = result.filePaths[0];
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const outputFileName = `${base}_Consulta${ext}`;
    const outputFilePath = path.join(dir, outputFileName);

    //console.log('Archivo seleccionado:', filePath);
    console.log('Archivo resultado:', outputFilePath);

    // Paso 1: Leer archivo
    const fileBuffer = fs.readFileSync(filePath);
    const formDataNode = new FormData();
    formDataNode.append('us', us);
    formDataNode.append('pw', pw);
    formDataNode.append('pk', pk);
    formDataNode.append('ak', ak);
    const fileBlob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formDataNode.append('file', fileBlob, path.basename(filePath));

    // Paso 2: Enviar al backend
    const response = await fetch('https://render-prueba-backend1.onrender.com/consultar', {
      method: 'POST',
      body: formDataNode
    });

    if (!response.ok) {
      throw new Error(`Error en backend: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Paso 3: Guardar archivo
    fs.writeFileSync(outputFilePath, Buffer.from(arrayBuffer));

    //console.log("output file path -> ", outputFilePath)
    return { success: true, outputFilePath };
  } catch (err) {
    console.error('Error en procesar-archivo:', err);
    return { success: false, error: err.message };
  }
});