import React, { useEffect, useRef, useState } from "react";
import { Shield, Layers, Radio, Globe, Cpu, Database, Activity, Terminal } from "lucide-react";

export default function Dashboard({ files, blockchain, wallet, onTabChange }) {
  const radarRef = useRef(null);
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Calculate stats
  const totalFiles = files.length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const formattedSize = totalSize > 1024 * 1024 
    ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` 
    : totalSize > 1024 
    ? `${(totalSize / 1024).toFixed(1)} KB` 
    : `${totalSize} B`;

  // Telemetry logs simulation
  useEffect(() => {
    const logs = [
      "SYSTEM DECENTRALIZED PROTOCOL INITIALIZED...",
      "LOCAL SANDBOX NODE STARTED ON IP 127.0.0.1:4001",
      `GENESIS BLOCK VERIFIED: ${blockchain[0]?.hash.substring(0, 24)}...`,
      "ESTABLISHING HANDSHAKES WITH PEER NODES...",
      "CONNECTED PEER: US-EAST-01 (104.244.42.1) - PING: 22ms",
      "CONNECTED PEER: EU-WEST-02 (185.199.108.15) - PING: 78ms",
      "CONNECTED PEER: SG-EAST-01 (45.64.254.21) - PING: 134ms",
    ];

    setTerminalLogs(logs);

    const interval = setInterval(() => {
      const peers = ["US-EAST-01", "EU-WEST-02", "SG-EAST-01", "AU-SOUTH-01", "SA-EAST-01"];
      const randomPeer = peers[Math.floor(Math.random() * peers.length)];
      const ping = Math.floor(15 + Math.random() * 140);
      const newLog = `[TELEMETRY] ${randomPeer} block sync completed. Latency: ${ping}ms`;
      
      setTerminalLogs(prev => [...prev.slice(-8), newLog]);
    }, 4500);

    return () => clearInterval(interval);
  }, [blockchain]);

  // Canvas Radar Animation
  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let sweepAngle = 0;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = "300px";
    canvas.style.height = "200px";
    ctx.scale(dpr, dpr);

    const blips = [
      { x: 150 + 60, y: 100 - 40, label: "US-E1", angle: Math.atan2(-40, 60), lastDetected: 0 },
      { x: 150 - 80, y: 100 - 10, label: "EU-W2", angle: Math.atan2(-10, -80), lastDetected: 0 },
      { x: 150 + 40, y: 100 + 50, label: "SG-E1", angle: Math.atan2(50, 40), lastDetected: 0 },
      { x: 150 - 30, y: 100 + 40, label: "AU-S1", angle: Math.atan2(40, -30), lastDetected: 0 },
    ];

    const drawRadar = () => {
      ctx.clearRect(0, 0, 300, 200);

      const cx = 150;
      const cy = 100;
      const maxRadius = 90;

      // Draw radar screen backdrop
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 243, 255, 0.02)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 243, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw concentric rings
      [30, 60, 90].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 243, 255, 0.05)";
        ctx.stroke();
      });

      // Draw grid axes
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.05)";
      ctx.stroke();

      // Draw sweeping hand line
      sweepAngle = (sweepAngle + 0.015) % (Math.PI * 2);
      const sweepX = cx + Math.cos(sweepAngle) * maxRadius;
      const sweepY = cy + Math.sin(sweepAngle) * maxRadius;

      // Draw sweep tail gradient
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      grad.addColorStop(0, "rgba(0, 243, 255, 0)");
      grad.addColorStop(1, "rgba(0, 243, 255, 0.05)");

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepAngle - 0.4, sweepAngle);
      ctx.lineTo(cx, cy);
      ctx.fillStyle = "rgba(0, 243, 255, 0.08)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Update and Draw Blips
      blips.forEach(b => {
        // Check if radar sweep crosses blip angle
        const diff = Math.abs(sweepAngle - (b.angle < 0 ? b.angle + Math.PI * 2 : b.angle));
        if (diff < 0.05) {
          b.lastDetected = Date.now();
        }

        const timePassed = Date.now() - b.lastDetected;
        const opacity = Math.max(0, 1 - timePassed / 2000); // 2-second fade

        if (opacity > 0) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 243, 255, ${opacity})`;
          ctx.shadowColor = "#00f3ff";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          ctx.font = "8px Share Tech Mono";
          ctx.fillStyle = `rgba(0, 243, 255, ${opacity * 0.8})`;
          ctx.fillText(b.label, b.x + 8, b.y + 3);
        }
      });

      animationId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
      {/* Top Banner Overview */}
      <div className="hud-panel" style={{ padding: "20px", background: "linear-gradient(135deg, rgba(8,14,38,0.7), rgba(189,0,255,0.03))" }}>
        <div className="hud-corner-tag">network status // node overview</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <div>
            <h1 className="led-text animate-glitch" style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "1px" }}>
              ANON FILE NETWORK
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              P2P Encrypted Storage Web Dashboard. Connected with Sandbox Client.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => onTabChange("upload")} className="btn-neon">
              SECURE UPLOAD
            </button>
            <button onClick={() => onTabChange("vault")} className="btn-neon purple">
              OPEN VAULT
            </button>
          </div>
        </div>
      </div>

      {/* Grid statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        {/* Stat 1 */}
        <div className="hud-panel" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>ACTIVE PEERS</span>
            <Radio size={16} className="led-text" />
          </div>
          <div className="led-text" style={{ fontSize: "28px", fontWeight: "800" }}>4 ONLINE</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Simulated cluster connections</div>
        </div>

        {/* Stat 2 */}
        <div className="hud-panel" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>BLOCK HEIGHT</span>
            <Layers size={16} className="led-text purple" />
          </div>
          <div className="led-text purple" style={{ fontSize: "28px", fontWeight: "800" }}>#{blockchain.length - 1}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Latest block mined successfully</div>
        </div>

        {/* Stat 3 */}
        <div className="hud-panel" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>DATA INDEXED</span>
            <Database size={16} className="led-text yellow" />
          </div>
          <div className="led-text yellow" style={{ fontSize: "28px", fontWeight: "800" }}>{formattedSize}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{totalFiles} Encrypted Vault Files</div>
        </div>

        {/* Stat 4 */}
        <div className="hud-panel" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>GATEWAY CAPABILITY</span>
            <Globe size={16} className="led-text green" />
          </div>
          <div className="led-text green" style={{ fontSize: "28px", fontWeight: "800" }}>
            {wallet.connected ? "ACTIVE" : "STANDBY"}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            {wallet.connected ? `WALLET ${wallet.address.substring(0, 6)}...` : "ANONYMOUS READ ONLY"}
          </div>
        </div>
      </div>

      {/* Row 3: Radar and Terminal logs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        
        {/* Radar Peer Map */}
        <div className="hud-panel flex-center" style={{ padding: "20px", flexDirection: "column", minHeight: "280px" }}>
          <div className="hud-corner-tag">peer locator // ping scanner</div>
          <canvas ref={radarRef} style={{ display: "block" }} />
          <div style={{ display: "flex", gap: "15px", marginTop: "10px", fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Activity size={10} className="led-text" /> PING: AVG 56ms</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Activity size={10} className="led-text purple" /> JITTER: ±4ms</span>
          </div>
        </div>

        {/* Console Terminal Logs */}
        <div className="hud-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", minHeight: "280px" }}>
          <div className="hud-corner-tag">system logs // telemetry</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid rgba(0, 243, 255, 0.1)", paddingBottom: "6px" }}>
            <Terminal size={14} className="led-text" />
            <h3 className="led-text" style={{ fontSize: "12px" }}>CLIENT TELEMETRY TERMINAL</h3>
          </div>
          <div 
            style={{ 
              flex: 1, 
              background: "rgba(0, 0, 0, 0.4)", 
              padding: "12px", 
              borderRadius: "4px", 
              fontFamily: "var(--font-mono)", 
              fontSize: "11px", 
              color: "var(--text-secondary)",
              lineHeight: "1.6",
              overflowY: "auto",
              maxHeight: "180px"
            }}
          >
            {terminalLogs.map((log, idx) => (
              <div key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", padding: "2px 0" }}>
                <span className="led-text" style={{ marginRight: "6px" }}>&gt;</span>
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
