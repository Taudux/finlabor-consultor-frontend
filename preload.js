const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  buscarActualizaciones: () => ipcRenderer.invoke('buscar-actualizaciones'),
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file'),
  procesarArchivo: (filePath, us, pw, pk, ak) => ipcRenderer.invoke('procesar-archivo', { filePath, us, pw, pk, ak }),
  saveProcessedFile: (outputFilePath, arrayBufferBase64) =>
    ipcRenderer.invoke('guardar-archivo-procesado', outputFilePath, arrayBufferBase64)
});
