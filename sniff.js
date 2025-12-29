(() => {
  if (window.__SPX_NAME_ADDR__) {
    console.warn("SPX Name & Address Recorder sudah aktif");
    return;
  }

  console.log("🚀 SPX NAME & ADDRESS RECORDER AKTIF");

  window.__SPX_NAME_ADDR__ = {
    records: {},
    lastShipment: null
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const TARGET_FIELDS = [
    "buyer_name",
    "buyer_addr",
    "return_receiver_name",
    "return_dest_detail_addr"
  ];

  const getShipmentId = () => {
    const m = location.href.match(/SPXID[0-9A-Z]+/);
    return m ? m[0] : null;
  };

  async function processShipment(shipmentId) {
    if (window.__SPX_NAME_ADDR__.records[shipmentId]) {
      console.log("⏭️ Sudah direkam:", shipmentId);
      return;
    }

    console.log("📦 Proses:", shipmentId);

    const record = {
      shipment_id: shipmentId,
      buyer_name: "",
      buyer_addr: "",
      return_receiver_name: "",
      return_dest_detail_addr: ""
    };

    try {
      const trade = await fetch(
        `https://spx.shopee.co.id/api/fleet_order/order/detail/trade_info?shipment_id=${shipmentId}`,
        { credentials: "include" }
      ).then(r => r.json());

      const allowed =
        trade?.data?.sensitive_permission?.click_to_view_field_list || [];

      for (const field of TARGET_FIELDS) {
        if (!allowed.includes(field)) continue;

        try {
          const res = await fetch(
            `https://spx.shopee.co.id/api/fleet_order/order/detail/show_sensitive_data?shipment_id=${shipmentId}&data_field=${field}`,
            { credentials: "include", cache: "no-store" }
          );
          const json = await res.json();
          record[field] = json?.data?.data_detail || "";
          console.log("✔️", field, "=", record[field]);
          await sleep(300);
        } catch {
          record[field] = "";
        }
      }

      window.__SPX_NAME_ADDR__.records[shipmentId] = record;
    } catch (e) {
      console.error("❌ Gagal:", shipmentId);
    }
  }

  // SPA URL observer
  const pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(history, arguments);
    setTimeout(check, 800);
  };

  window.addEventListener("popstate", () => setTimeout(check, 800));

  async function check() {
    const shipmentId = getShipmentId();
    if (!shipmentId) return;
    if (shipmentId === window.__SPX_NAME_ADDR__.lastShipment) return;

    window.__SPX_NAME_ADDR__.lastShipment = shipmentId;
    await sleep(500);
    processShipment(shipmentId);
  }

  check();

  // EXPORT CSV
  window.exportSPXCSV = () => {
    const data = Object.values(window.__SPX_NAME_ADDR__.records);
    if (!data.length) {
      console.warn("❌ Tidak ada data");
      return;
    }

    const headers = [
      "shipment_id",
      "buyer_name",
      "buyer_addr",
      "return_receiver_name",
      "return_dest_detail_addr"
    ];

    const rows = [
      headers.join(","),
      ...data.map(o =>
        headers.map(h => `"${(o[h] || "").replace(/"/g, '""')}"`).join(",")
      )
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spx_nama_alamat.csv";
    a.click();

    console.log("📁 CSV siap: spx_nama_alamat.csv");
  };
})();
