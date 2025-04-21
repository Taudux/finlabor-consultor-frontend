const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  buscarActualizaciones: () => ipcRenderer.invoke('buscar-actualizaciones'),
  runPythonScript: () => ipcRenderer.invoke('runPythonScript')
});
