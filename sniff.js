(function () {
  if (window.__SPX_RECORDER__) {
    console.warn("Recorder sudah aktif");
    return;
  }

  window.__SPX_RECORDER__ = {
    data: [],
    currentShipment: null
  };

  console.log("✅ SPX Recorder AKTIF");

  // Tangkap shipment_id dari URL
  const getShipmentId = () => {
    const match = location.href.match(/SPXID[0-9A-Z]+/);
    return match ? match[0] : null;
  };

  // Hook fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await originalFetch.apply(this, args);

    try {
      const url = args[0]?.toString() || "";
      if (url.includes("show_sensitive_data")) {
        const clone = res.clone();
        const json = await clone.json();

        const shipment_id = new URL(url).searchParams.get("shipment_id");
        const field = new URL(url).searchParams.get("data_field");
        const value = json?.data?.data_detail || null;

        window.__SPX_RECORDER__.data.push({
          time: new Date().toISOString(),
          shipment_id,
          field,
          value
        });

        console.log("📥 Terekam:", shipment_id, field, value);
      }
    } catch (e) {}

    return res;
  };

  // Helper export
  window.exportSPX = function () {
    const data = window.__SPX_RECORDER__.data;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spx_recorded_data.json";
    a.click();

    console.log("📁 File disimpan: spx_recorded_data.json");
  };

})();
