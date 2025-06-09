const { estadosCatalogo } = require('./constantes.js');

// Función para limpiar acentos y normalizar texto
function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .toUpperCase()
        .replace(/\s+/g, " ")            // Quita espacios múltiples
        .trim();
}

// Busca la clave para cualquier variante de nombre de estado
function obtenerClaveEstado(nombreEstado) {
    const nombreNormalizado = normalizarTexto(nombreEstado);

    for (const { clave, nombres } of estadosCatalogo) {
        for (const nombre of nombres) {
            if (nombreNormalizado === normalizarTexto(nombre)) {
                return clave;
            }
        }
    }
    console.log('NOMBRE DE ESTADO: ' + nombreEstado + ' NO EXISTE EN EL CATÁLOGO ACTUAL');
    return nombreEstado; // Si no lo encuentra, regresa vacío
}


/*FUNCION PARA FORMATEAR CORRECTAMENTE LAS FECHAS*/
function normalizarFecha(fecha) {
    // Verifica que sea string y elimina espacios
    if (typeof fecha !== 'string') {
        console.log('ERROR EN EL FORMATO DE LA FECHA, NO ES STRING');
        return '';
    }
    fecha = fecha.trim();

    // Divide la fecha en partes usando el guion como separador
    const partes = fecha.split('-');
    if (partes.length !== 3) { 
        console.log('ERROR EN EL FORMATO DE LA FECHA: FALTA EL MES, EL DIA O EL AÑO');
        return '';
    }

    let [anio, mes, dia] = partes.map(Number);

    // Valida que sean números y dentro de rangos
    if (
        isNaN(anio) || isNaN(mes) || isNaN(dia) ||
        anio < 1000 || anio > 9999 ||
        mes < 1 || mes > 12 ||
        dia < 1 || dia > 31
    ) {
        console.log('ERROR EN EL FORMATO DE LA FECHA, NO ES NÚMERO VÁLIDO');
        return '';
    }

    // Valida que sea una fecha real en calendario
    const dateObj = new Date(anio, mes - 1, dia);
    if (
        dateObj.getFullYear() !== anio ||
        dateObj.getMonth() + 1 !== mes ||
        dateObj.getDate() !== dia
    ) {
        console.log('ERROR EN EL FORMATO DE LA FECHA, NO ES UNA FECHA REAL');
        return '';
    }

    // Rellena ceros donde falte y retorna la fecha normalizada
    const anioStr = String(anio).padStart(4, '0');
    const mesStr = String(mes).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    return `${anioStr}-${mesStr}-${diaStr}`;
}

module.exports = { obtenerClaveEstado, normalizarFecha };