const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  buscarActualizaciones: () => ipcRenderer.invoke('buscar-actualizaciones'),
  runPythonScript: () => ipcRenderer.invoke('run-python-script')
});
