/*
    BLOQUE QUE SE ENCARGA DE FIRMAR EL BODY 
    DE LA PETICION A CIRCULO 
    
    AUTOR: YAEL P. RINCON
    FECHA: JUNIO 2025
*/
const rs = require('jsrsasign');

function signBody(bodyString, privateKey) {
    try {
        console.log('FIRMANDO PAYLOAD...');
        const sig = new rs.KJUR.crypto.Signature({ "alg": "SHA256withECDSA", "prov": "cryptojs/jsrsa" });
        sig.init({ d: privateKey, curve: "secp384r1" });
        sig.updateString(bodyString);
        console.log('FIRMA EXITOSA.')
        return sig.sign();
    } catch (err) {
        console.error('Error al firmar:', err);
        throw err;
    }
}

module.exports = { signBody };