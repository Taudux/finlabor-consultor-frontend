window.electronAPI.onSetLogo((event, logoPath) => {
    const logoElement = document.getElementById('logo');
    if (logoElement) {
        logoElement.src = `file://${logoPath}`;
    }
});

document.getElementById('select-excel').addEventListener('click', async () => {
    const us = document.getElementById('usuario').value;
    const pw = document.getElementById('password').value;
    const pk = document.getElementById('privatekey').value;
    const ak = document.getElementById('apikey').value;
    const overlay = document.getElementById('overlay');

    if (!us || !pw || !pk || !ak) {
        alert("Por favor completa todos los campos antes de continuar.");
        return;
    }

    const fileResult = await window.electronAPI.selectExcelFile();
    if (!fileResult || !fileResult.filePath) {
        alert('No seleccionaste ningún archivo válido.');
        return;
    }

    try {
        // Mostrar overlay de carga
        overlay.style.display = "flex";

        const { filePath } = fileResult;
        const result = await window.electronAPI.procesarArchivo(filePath, us, pw, pk, ak);

        if (result.success) {
            alert(`✅ Archivo procesado correctamente y guardado en:\n${result.outputFilePath}`);
        } else {
            alert(`❌ Ocurrió un error al procesar el archivo:\n${result.error}`);
        }
    } catch (error) {
        console.error("Error en procesamiento:", error);
        alert(`❌ Error inesperado: ${error.message}`);
    } finally {
        // Ocultar overlay de carga
        overlay.style.display = "none";
    }
});

document.getElementById('btn-circulo').addEventListener('click', async () => {
    const us = document.getElementById('usuario').value;
    const pw = document.getElementById('password').value;
    const pk = document.getElementById('privatekey').value;
    const ak = document.getElementById('apikey').value;
    let responses = new Array();
    const apiUrl = 'https://omtaxzvaqb.execute-api.us-east-1.amazonaws.com/v1/rcc-ficoscore-pld'; //URL DE CONSULTA A CIRCULO (DESARROLLO)

    if (!us || !pw || !pk || !ak) {
        alert("Por favor completa todos los campos antes de continuar.");
        return;
    }

    const fileResult = await window.electronAPI.selectExcelFile();
    if (!fileResult || !fileResult.filePath) {
        alert('No seleccionaste ningún archivo válido.');
        return;
    }

    const { filePath } = fileResult;
    const result = await window.electronAPI.leerExcel(filePath); //REGRESA UN ARREGLO CON TODOS LOS JSONS PARA REALIZAR CONSULTAS AL API
    if (result.success) {
        console.log('Payloads generados:', result.payloads);
    }

    for (let i = 0; i < result.payloads.length; i++) {
        const payload = result.payloads[i];

        try {
            const resultado = await window.electronAPI.consultaCirculo(apiUrl, payload, pk, ak, us, pw);

            if (resultado.success) {
                //alert("Respuesta de Círculo:\n" + JSON.stringify(resultado.data, null, 2));
                responses[i] = resultado;
            } else {
                alert('❌ Error en la consulta:\n' + resultado.error);
                console.error(resultado.error);
            }
        } catch (error) {
            alert('❌ Error inesperado:\n' + error.message);
            console.error(error);
        }
    }


});