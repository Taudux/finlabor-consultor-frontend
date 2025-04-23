window.addEventListener('DOMContentLoaded', () => {
  const checkUpdatesBtn = document.getElementById('check-updates');
  const runPythonBtn = document.getElementById('run-python');

  // Buscar actualizaciones (ya conectado vía IPC con main.js si lo necesitas)
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', async () => {
      const { ipcRenderer } = require('electron');
      await ipcRenderer.invoke('buscar-actualizaciones');
    });
  }

  // Ejecutar suma desde el backend FastAPI en Render (vía HTTPS)
  if (runPythonBtn) {
    runPythonBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('https://render-prueba-backend1.onrender.com/sumar');
        const data = await response.json();
        alert(data.mensaje);
      } catch (error) {
        console.error('❌ Error al conectar con el backend:', error);
        alert('No se pudo conectar con el backend.');
      }
    });
  }
});
