const { ipcRenderer } = require('electron');

document.getElementById('check-updates').addEventListener('click', () => {
  ipcRenderer.invoke('buscar-actualizaciones');
});

// Botón que llama a Python
document.getElementById('run-python').addEventListener('click', async () => {
  try {
    await ipcRenderer.invoke('ejecutar-python');
  } catch (error) {
    console.error('Error al ejecutar Python:', error);
  }
});
