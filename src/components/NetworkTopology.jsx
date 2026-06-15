import React, { useEffect, useRef } from "react";

export default function NetworkTopology() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let time = 0;

    // Handle high DPI monitors
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Fixed network constellation points (relative to 800x280 coordinate system)
    const baseNodes = [
      { rx: 0.15, ry: 0.25, label: "NODE-US-EAST", type: "Gateway" },
      { rx: 0.35, ry: 0.20, label: "NODE-EU-WEST", type: "Consensus" },
      { rx: 0.55, ry: 0.30, label: "NODE-ASIA-SE", type: "Consensus" },
      { rx: 0.75, ry: 0.25, label: "NODE-JP-E1", type: "Gateway" },
      { rx: 0.25, ry: 0.70, label: "STORAGE-A", type: "Store" },
      { rx: 0.45, ry: 0.65, label: "STORAGE-B", type: "Store" },
      { rx: 0.65, ry: 0.75, label: "VALIDATOR-01", type: "Validator" },
      { rx: 0.85, ry: 0.60, label: "VALIDATOR-02", type: "Validator" }
    ];

    const connections = [
      [0, 1], [1, 2], [2, 3],
      [0, 4], [1, 5], [2, 6], [3, 7],
      [4, 5], [5, 6], [6, 7],
      [0, 5], [2, 7]
    ];

    const packets = [];

    // Helper to spawn packet
    const spawnPacket = () => {
      const connIndex = Math.floor(Math.random() * connections.length);
      const [fromIdx, toIdx] = connections[connIndex];
      // Random direction
      const reverse = Math.random() > 0.5;
      
      packets.push({
        from: reverse ? toIdx : fromIdx,
        to: reverse ? fromIdx : toIdx,
        progress: 0,
        speed: 0.006 + Math.random() * 0.006,
        size: Math.random() * 1.5 + 1.2
      });
    };

    // Spawn initial packets
    for (let i = 0; i < 5; i++) {
      spawnPacket();
    }

    const draw = () => {
      time += 0.01;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // 1. Calculate active node coordinates with calm orbital drift
      const currentNodes = baseNodes.map((bn, idx) => {
        // Subtle organic sine drift to make topology feel alive
        const dx = Math.sin(time + idx * 1.5) * 5;
        const dy = Math.cos(time + idx * 1.2) * 5;
        return {
          x: bn.rx * w + dx,
          y: bn.ry * h + dy,
          label: bn.label,
          type: bn.type
        };
      });

      // 2. Draw Connection Lines
      ctx.lineWidth = 1;
      connections.forEach(([from, to]) => {
        const n1 = currentNodes[from];
        const n2 = currentNodes[to];
        
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        // Slate-purple subtle lines
        ctx.strokeStyle = "rgba(99, 102, 241, 0.09)";
        ctx.stroke();
      });

      // 3. Update & Draw Packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          packets.splice(i, 1);
          spawnPacket(); // Loop packets
          continue;
        }

        const n1 = currentNodes[p.from];
        const n2 = currentNodes[p.to];

        // Smooth position interpolation
        const px = n1.x + (n2.x - n1.x) * p.progress;
        const py = n1.y + (n2.y - n1.y) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "#60A5FA"; // Accent blue packet
        ctx.shadowColor = "#60A5FA";
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 4. Draw Nodes (circles + labels)
      currentNodes.forEach((n, idx) => {
        // Node outer ring pulsing slightly
        const outerPulse = 6 + Math.sin(time * 2 + idx) * 1.5;

        // Outer glow circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, outerPulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // Sleek text label above the node
        ctx.font = "500 9px Inter";
        ctx.fillStyle = "#94A3B8";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y - 12);

        // Sublabel
        ctx.font = "400 7px JetBrains Mono";
        ctx.fillStyle = "#475569";
        ctx.fillText(n.type.toUpperCase(), n.x, n.y + 14);
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "260px",
        background: "rgba(15, 22, 42, 0.15)",
        borderRadius: "12px"
      }}
    />
  );
}
