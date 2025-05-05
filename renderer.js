document.getElementById('select-excel').addEventListener('click', async () => {
  const us = document.getElementById('usuario').value;
  const pw = document.getElementById('password').value;
  const pk = document.getElementById('privatekey').value;
  const ak = document.getElementById('apikey').value;

  if (!us || !pw || !pk || !ak) {
    alert("Por favor completa todos los campos antes de continuar.");
    return;
  }

  const fileResult = await window.electronAPI.selectExcelFile();
  if (!fileResult || !fileResult.filePath) {
    alert('No seleccionaste ningún archivo válido.');
    return;
  }

  const { filePath, outputPath } = fileResult;

  console.log("fileResult:", fileResult);
  console.log("fileResult.filePath:", fileResult.filePath);

  const result = await window.electronAPI.procesarArchivo(filePath, us, pw, pk, ak);

  if (result.success) {
    alert(`Archivo procesado correctamente y guardado en:\n${result.outputFilePath}`);
  } else {
    alert(`Ocurrió un error al procesar el archivo:\n${result.error}`);
  }
});
