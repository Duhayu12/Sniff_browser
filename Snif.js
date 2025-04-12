(() => {
  const logs = [];

  const tryParseJSON = (str) => {
    try { return JSON.parse(str); } catch { return str; }
  };

  const formatLogEntry = (entry, index) => {
    let lines = [];
    lines.push(`==================== Request ${index + 1} ====================`);
    lines.push(`Timestamp: ${entry.timestamp}`);
    lines.push(`Name: ${entry.name}`);
    lines.push(``);
    lines.push(`--- General ---`);
    lines.push(`Request URL: ${entry.url}`);
    lines.push(`Request Method: ${entry.method}`);
    lines.push(`Status Code: ${entry.status}`);
    lines.push(``);
    lines.push(`--- Request Headers ---`);
    for (const key in entry.requestHeaders) {
      lines.push(`${key}: ${entry.requestHeaders[key]}`);
    }
    lines.push(``);
    lines.push(`--- Request Payload ---`);
    lines.push(typeof entry.requestBody === 'object' ? JSON.stringify(entry.requestBody, null, 2) : String(entry.requestBody || '(empty)'));
    lines.push(``);
    lines.push(`--- Response Headers ---`);
    for (const key in entry.responseHeaders) {
      lines.push(`${key}: ${entry.responseHeaders[key]}`);
    }
    lines.push(``);
    lines.push(`--- Response Body (Preview) ---`);
    lines.push(typeof entry.responseBody === 'object' ? JSON.stringify(entry.responseBody, null, 2) : String(entry.responseBody || '(empty)'));
    lines.push(``);
    if (entry.cookie) {
      lines.push(`--- document.cookie ---`);
      lines.push(entry.cookie);
    }
    return lines.join('\n');
  };

  const getNameFromUrl = (url) => {
    try {
      const u = new URL(url);
      const path = u.pathname.split('/').filter(Boolean);
      return path.pop() || '(root)';
    } catch {
      return '(unknown)';
    }
  };

  const cloneHeaders = (headers) => {
    const result = {};
    if (headers && typeof headers.forEach === "function") {
      headers.forEach((v, k) => result[k] = v);
    } else if (typeof headers === "object") {
      Object.entries(headers).forEach(([k, v]) => result[k] = v);
    }
    return result;
  };

  // --- fetch logger ---
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [input, init = {}] = args;
    const url = typeof input === "string" ? input : input.url;
    const method = init.method || 'GET';
    const reqHeaders = cloneHeaders(init.headers || {});
    const body = init.body || null;
    const timestamp = new Date().toISOString();

    const response = await originalFetch(...args);
    const cloned = response.clone();
    const resHeaders = cloneHeaders(cloned.headers);
    const resText = await cloned.text();

    logs.push({
      timestamp,
      name: getNameFromUrl(url),
      url,
      method,
      status: `${response.status} ${response.statusText}`,
      requestHeaders: reqHeaders,
      requestBody: tryParseJSON(body),
      responseHeaders: resHeaders,
      responseBody: tryParseJSON(resText),
      cookie: location.origin === new URL(url).origin ? document.cookie : null
    });

    return response;
  };

  // --- XHR logger ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const xhr = this;
    const requestBody = body;
    const requestHeaders = {};
    const timestamp = new Date().toISOString();

    const origSetHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (key, val) {
      requestHeaders[key] = val;
      return origSetHeader.call(this, key, val);
    };

    xhr.addEventListener('load', function () {
      const rawHeaders = xhr.getAllResponseHeaders();
      const responseHeaders = {};
      rawHeaders.trim().split(/[\r\n]+/).forEach(line => {
        const parts = line.split(': ');
        const key = parts.shift();
        const value = parts.join(': ');
        if (key) responseHeaders[key.toLowerCase()] = value;
      });

      logs.push({
        timestamp,
        name: getNameFromUrl(xhr._url),
        url: xhr._url,
        method: xhr._method,
        status: `${xhr.status} ${xhr.statusText}`,
        requestHeaders,
        requestBody,
        responseHeaders,
        responseBody: tryParseJSON(xhr.responseText),
        cookie: location.origin === new URL(xhr._url).origin ? document.cookie : null
      });
    });

    return origSend.call(this, body);
  };

  window.saveLogs = function () {
    if (!logs.length) {
      console.warn("No logs to save.");
      return;
    }

    const content = logs.map((log, i) => formatLogEntry(log, i)).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`[Logger] Saved ${logs.length} entries to .txt`);
  };

  console.log('%c[Network Logger] Aktif! Ketik saveLogs() untuk menyimpan log ke file .txt', 'color: green; font-weight: bold;');
})();
