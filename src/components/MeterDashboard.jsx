import React, { useEffect, useState } from "react";
import bridge from "../services/integratedBridge";

export default function MeterDashboard({ faderMappings = [1, 2] }) {
  const [meters, setMeters] = useState([]);
  const [connected, setConnected] = useState(bridge.isConnected?.() ?? false);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    bridge.on("connect", handleConnect);
    bridge.on("disconnect", handleDisconnect);

    // Poll meters every 0.5s
    let interval;
    const pollMeters = () => {
      if (bridge.isConnected?.()) {
        bridge.requestMeters?.();
      }
    };
    interval = setInterval(pollMeters, 500);
    pollMeters();

    // Listen for meter data
    const handleMeters = (data) => {
      setMeters(data.meters || []);
      setConnected(true);
    };
    bridge.on("meters", handleMeters);

    // Optionally subscribe to meters stream if needed by your bridge
    bridge.subscribeMeters?.();

    return () => {
      bridge.off("connect", handleConnect);
      bridge.off("disconnect", handleDisconnect);
      bridge.off("meters", handleMeters);
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      {/* Render your meters and other UI elements here */}
    </div>
  );
}