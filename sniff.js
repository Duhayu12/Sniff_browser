(() => {
  const logs = [];

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const method = config?.method || "GET";
    const headers = config?.headers || {};
    const body = config?.body || "(none)";
    try {
      const res = await originalFetch(...args);
      const cloned = res.clone();
      const text = await cloned.text();
      logs.push(`[FETCH] ${method} ${resource}\nHeaders: ${JSON.stringify(headers, null, 2)}\nBody: ${body}\nResponse: ${text}\n---`);
      return res;
    } catch (err) {
      logs.push(`[FETCH] ${method} ${resource}\nERROR: ${err.message}\n---`);
      throw err;
    }
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const oldOnLoad = xhr.onload;
    xhr.onload = function() {
      logs.push(`[XHR] ${xhr._method} ${xhr._url}\nBody: ${body || "(none)"}\nResponse: ${xhr.responseText}\n---`);
      if (oldOnLoad) oldOnLoad.apply(this, arguments);
    };
    return originalSend.apply(this, arguments);
  };

  // Save logs function
  window.saveLogs = function() {
    const content = logs.join('\n\n');
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Saved ${logs.length} logs to file.`);
  };

  console.log(">>> Logging aktif. Ketik saveLogs() untuk menyimpan semua request ke file .txt");
})();
