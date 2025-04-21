document.getElementById('check-updates').addEventListener('click', () => {
  window.electronAPI.buscarActualizaciones();
});

document.getElementById('run-python').addEventListener('click', () => {
  window.electronAPI.runPythonScript();
});