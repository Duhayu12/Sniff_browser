(function () {
  const logs = [];

  const saveLogs = () => {
    const content = logs.map((log, i) => {
      return `[${i + 1}] ${log.type}
URL: ${log.url}
Method: ${log.method}
Headers: ${JSON.stringify(log.headers, null, 2)}
Body: ${log.body || '[No body]'}
Response:
${log.response || '[No response]'}
---------------------------`;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network_logs.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('%c[Logs saved as network_logs.txt]', 'color: green');
  };

  window.saveLogs = saveLogs;

  const logRequest = (type, method, url, headers, body, response) => {
    logs.push({ type, method, url, headers, body, response });
  };

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const method = (config?.method || 'GET').toUpperCase();
    const headers = config?.headers || {};
    const body = config?.body || '';

    try {
      const response = await originalFetch(...args);
      const cloned = response.clone();
      let responseBody;
      try {
        responseBody = await cloned.text();
      } catch (e) {
        responseBody = '[Cannot read response]';
      }

      logRequest('FETCH', method, resource, headers, body, responseBody);
      return response;
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  };

  // Intercept XMLHttpRequest
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    this._method = method;
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('load', () => {
      const headers = {};
      this.getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          const parts = line.split(': ');
          const header = parts.shift();
          const value = parts.join(': ');
          headers[header] = value;
        });

      let responseText = this.responseText;
      try {
        const parsed = JSON.parse(responseText);
        responseText = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Keep original
      }

      logRequest('XHR', this._method, this._url, headers, body, responseText);
    });
    return send.apply(this, arguments);
  };

  console.log('%c[Sniffer aktif. Ketik saveLogs() di console untuk menyimpan hasil]', 'color: lime');
})();
