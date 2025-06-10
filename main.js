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
const { signBody } = require('./signKJUR');
const XLSX = require('xlsx');
const {obtenerClaveEstado, normalizarFecha, excelSerialToDateString} = require('./funcionesConsulta');


let mainWindow;

// Logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('🔧 Aplicación iniciada');
autoUpdater.autoDownload = false;

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

  mainWindow.setMenu(null);
  mainWindow.loadFile('index.html');
  //SHORTCUT PARA ABRIR DEVTOOLS
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.openDevTools({ mode: 'detach' }); // o 'right'
    }
  });

  //Ruta del logo para enviarla al renderer
  const logoPath = path.join(__dirname, 'build', 'finlabor_logo-removebg-preview.png');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-logo', logoPath);
  });

  mainWindow.on('closed', () => { mainWindow = null });
}

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

ipcMain.handle('procesar-archivo', async (event, { filePath, responses }) => {
  try {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const outputFileName = `${base}_Consulta${ext}`;
    const outputFilePath = path.join(dir, outputFileName);

    console.log('Archivo resultado:', outputFilePath);

    const fileBuffer = fs.readFileSync(filePath);
    const formDataNode = new FormData();

    const backendResponse = await fetch('https://finlabor-consultor-backend.onrender.com/consultar', { // URL DEL BACK END PARA CREAR EXCEL DE RESULTADO
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuestas: responses })
    });

    if (!backendResponse.ok) {
      throw new Error(`Error en backend: ${backendResponse.status} ${backendResponse.statusText}`);
    }

    const arrayBuffer = await backendResponse.arrayBuffer();
    fs.writeFileSync(outputFilePath, Buffer.from(arrayBuffer));

    return { success: true, outputFilePath };
  } catch (err) {
    console.error('Error en procesar-archivo:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('consulta-circulo', async (event, { apiUrl, payload, privateKey, apiKey, usuario, password }) => {
  try {

    /*VALIDACION DE CLAVE ESTADO */
    let estado = payload['domicilio']['estado'];
    if(estado.length > 4){
      payload['domicilio']['estado'] = obtenerClaveEstado(estado);
    }

    /*VALIDACION DEL FORMATO DE LA FECHA */
    let serialFecha = payload['fechaNacimiento'];
    payload['fechaNacimiento'] = excelSerialToDateString(serialFecha);

    /*VALIDACION DE LAS FECHAS */
    let fechaNacimiento = payload['fechaNacimiento'];
    payload['fechaNacimiento'] = normalizarFecha(fechaNacimiento);

    console.log('Payload antes de solicitar historial: ', payload);
    const bodyString = JSON.stringify(payload);
    const signature = signBody(bodyString, privateKey);
    const headers = {
      'Content-Type': 'application/json',
      'x-signature': signature,
      'x-api-key': apiKey,
      'username': usuario,
      'password': password
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: bodyString
    });

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    console.error('Error en consulta-circulo:', error);
    return { success: false, error: error.message };
  }
})

ipcMain.handle('leer-excel', async (event, filePath) => {
  try {
    // Lee el archivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convierte hoja a array de objetos
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Mapea cada fila al formato requerido
    const payloads = rows.map(row => ({
      apellidoPaterno: row['apellidoPaterno'] || '',
      apellidoMaterno: row['apellidoMaterno'] || '',
      primerNombre: row['primerNombre'] || '',
      fechaNacimiento: row['fechaNacimiento'] || '',
      RFC: row['RFC'] || '',
      nacionalidad: row['nacionalidad'] || 'MX',
      domicilio: {
        direccion: row['direccion'] || '',
        coloniaPoblacion: row['coloniaPoblacion'] || '',
        delegacionMunicipio: row['delegacionMunicipio'] || '',
        ciudad: row['ciudad'] || '',
        estado: row['estado'] || '',
        CP: String(row['CP'] || '') // Para mantener ceros a la izquierda
      }
    }));

    return { success: true, payloads };

  } catch (error) {
    console.error('Error leyendo el archivo Excel:', error);
    return { success: false, error: error.message };
  }
})