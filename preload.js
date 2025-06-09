const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  buscarActualizaciones: () => ipcRenderer.invoke('buscar-actualizaciones'),
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file'),
  procesarArchivo: (filePath, responses) => ipcRenderer.invoke('procesar-archivo', { filePath, responses }),
  saveProcessedFile: (outputFilePath, arrayBufferBase64) =>
    ipcRenderer.invoke('guardar-archivo-procesado', outputFilePath, arrayBufferBase64),
  onSetLogo: (callback) => ipcRenderer.on('set-logo', callback),
  consultaCirculo: (apiUrl, payload, privateKey, apiKey, usuario, password) => ipcRenderer.invoke('consulta-circulo', {apiUrl, payload, privateKey, apiKey, usuario, password}),
  leerExcel: (filePath) => ipcRenderer.invoke('leer-excel', filePath)
});
