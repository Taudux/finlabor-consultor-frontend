const { ipcRenderer } = require('electron');

document.getElementById('check-updates').addEventListener('click', () => {
  ipcRenderer.invoke('buscar-actualizaciones');
});
