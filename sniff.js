(() => {
  const logs = [];

  const formatPreview = (text) => {
    try {
      return JSON.parse(text); // Simpan sebagai objek asli jika JSON valid
    } catch {
      return text; // Kalau bukan JSON, tetap simpan sebagai string
    }
  };

  // PATCH FETCH
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config = {}] = args;
    const method = config.method || "GET";
    const headers = config.headers || {};
    const body = config.body || null;

    try {
      const res = await originalFetch(...args);
      const cloned = res.clone();
      const text = await cloned.text();

      // Get response headers
      const responseHeaders = {};
      for (let [key, value] of res.headers.entries()) {
        responseHeaders[key] = value;
      }

      logs.push({
        type: "fetch",
        method,
        url: resource,
        requestHeaders: headers,
        payload: body,
        responseHeaders,
        response: text,
        preview: formatPreview(text),
        timestamp: new Date().toISOString()
      });

      return res;
    } catch (err) {
      logs.push({
        type: "fetch",
        method,
        url: resource,
        error: err.message,
        timestamp: new Date().toISOString()
      });
      throw err;
    }
  };

  // PATCH XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const payload = body || null;
    const oldOnLoad = xhr.onload;

    xhr.onload = function() {
      // Parse response headers
      const rawHeaders = xhr.getAllResponseHeaders();
      const responseHeaders = {};
      rawHeaders.trim().split(/[\r\n]+/).forEach(line => {
        const parts = line.split(': ');
        const header = parts.shift();
        const value = parts.join(': ');
        responseHeaders[header] = value;
      });

      logs.push({
        type: "xhr",
        method: xhr._method,
        url: xhr._url,
        payload,
        responseHeaders,
        response: xhr.responseText,
        preview: formatPreview(xhr.responseText),
        timestamp: new Date().toISOString()
      });

      if (oldOnLoad) oldOnLoad.apply(this, arguments);
    };

    return originalSend.apply(this, arguments);
  };

  // Export function
  window.saveLogs = function() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Saved ${logs.length} logs to JSON file.`);
  };

  console.log(">>> Logging JSON aktif. Ketik saveLogs() untuk simpan semua ke file .json");
})();
