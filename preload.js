const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  buscarActualizaciones: () => ipcRenderer.invoke('buscar-actualizaciones'),
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file'),
  procesarArchivo: (filePath, responses) => ipcRenderer.invoke('procesar-archivo', { filePath, responses }),
  saveProcessedFile: (outputFilePath, arrayBufferBase64) =>
    ipcRenderer.invoke('guardar-archivo-procesado', outputFilePath, arrayBufferBase64),
  onSetLogo: (callback) => ipcRenderer.on('set-logo', callback),
  consultaCirculo: (apiUrl, payload, privateKey, apiKey, usuario, password) => ipcRenderer.invoke('consulta-circulo', { apiUrl, payload, privateKey, apiKey, usuario, password }),
  leerExcel: (filePath) => ipcRenderer.invoke('leer-excel', filePath)
});

// ======= INYECCIÓN EN MUNDO PRINCIPAL + PUENTE A MAIN (PERSISTENCIA JSON) =======
(() => {
  const { ipcRenderer } = require('electron');

  // 1) Inyecta en el MUNDO PRINCIPAL un wrapper de console.* que hace postMessage
  function injectConsoleHookInMainWorld() {
    const code = `
      (function() {
        if (window.__finlaborConsoleHooked) return;
        window.__finlaborConsoleHooked = true;

        const _orig = {
          log: console.log, info: console.info, warn: console.warn, error: console.error
        };

        function send(level, args, tag) {
          try {
            // Enviamos los argumentos crudos al preload vía postMessage (structured clone)
            window.postMessage({ __finlaborLog: true, level, parts: Array.from(args), tag }, "*");
          } catch(_) {}
        }

        ['log','info','warn','error'].forEach((level) => {
          console[level] = function() {
            try { send(level, arguments, 'console'); } catch(_) {}
            try { return _orig[level].apply(console, arguments); } catch(_) {}
          };
        });

        // Errores no manejados en el MUNDO PRINCIPAL (renderer)
        window.addEventListener('error', function(e){
          send('error', ['Uncaught:', e.message, '@', e.filename + ':' + e.lineno + ':' + e.colno], 'window.error');
        });
        window.addEventListener('unhandledrejection', function(e){
          const r = (e && e.reason && e.reason.message) || (e && e.reason) || '(sin detalle)';
          send('error', ['UnhandledRejection:', r], 'window.unhandledrejection');
        });
      })();
    `;
    const s = document.createElement('script');
    s.textContent = code;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  }

  // 2) Serializador seguro (maneja BigInt y referencias circulares)
  function safeStringify(value) {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    });
  }
  const serializeArg = (arg) => {
    if (typeof arg === 'string') return arg;
    try { return safeStringify(arg); } catch { try { return String(arg); } catch { return '[Unserializable]'; } }
  };

  // 3) Recibe del mundo principal y reenvía al MAIN por IPC
  window.addEventListener('message', (ev) => {
    const data = ev?.data;
    if (!data || !data.__finlaborLog) return;
    const { level = 'info', parts = [], tag = 'console' } = data;
    const serialized = Array.isArray(parts) ? parts.map(serializeArg) : [serializeArg(parts)];
    ipcRenderer.send('renderer-log', { level, parts: serialized, tag });
  });

  // 4) Ejecuta la inyección lo antes posible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectConsoleHookInMainWorld);
  } else {
    injectConsoleHookInMainWorld();
  }
})();