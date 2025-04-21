document.getElementById('run-python').addEventListener('click', async () => {
  try {
    await window.api.runPythonScript();
  } catch (error) {
    console.error('❌ Error ejecutando script Python:', error);
  }
});

document.getElementById('check-updates').addEventListener('click', async () => {
  await window.api.buscarActualizaciones();
});
