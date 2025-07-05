const osc = import("osc");

const X_AIR_IP = "192.168.1.67";
const X_AIR_PORT = 10024;

const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 10026, // Use a different unused local port for debugging
  remoteAddress: X_AIR_IP,
  remotePort: X_AIR_PORT,
  metadata: true,
});

udpPort.open();

udpPort.on("ready", () => {
  console.log("✅ Connected to X Air for meter debugging");

  const msg = {
    address: "/meters",
    args: [
      { type: "s", value: "/meters/1" },
      { type: "i", value: 1 },
    ],
  };

  udpPort.send(msg);
  console.log("📡 Subscribed to /meters/1");
});

udpPort.socket.on("message", (buffer) => {
  try {
    const addressEnd = buffer.indexOf(0);
    const address = buffer.toString("ascii", 0, addressEnd);

    if (!address.startsWith("/meters/1")) return;

    const tagStart = buffer.indexOf(",b");
    if (tagStart === -1) return;

    const blobSizeOffset = (tagStart + 4 + 3) & ~0x03;
    const blobSize = buffer.readInt32BE(blobSizeOffset);
    const blobStart = blobSizeOffset + 4;

    if (blobStart + blobSize > buffer.length) {
      console.warn("⚠ Blob size exceeds packet length, skipping.");
      return;
    }

    const meters = [];
    const count = blobSize / 2;

    for (let i = 0; i < count; i++) {
      const val = buffer.readInt16BE(blobStart + i * 2);
      meters.push((val / 256).toFixed(2));
    }

    console.clear();
    console.log("🎚 Meter Levels (/meters/1):\n");
    meters.forEach((db, idx) => {
      console.log(`Channel ${idx + 1}: ${db} dB`);
    });
  } catch (err) {
    console.error("❌ Error parsing OSC message:", err.message);
  }
});
