import React, { useEffect, useRef } from "react";

export default function CanvasBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Handle high DPI screens
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particle/Node definition
    const nodeCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 20000), 75);
    const nodes = [];
    const packets = [];
    const maxDistance = 120; // max line connection distance

    // Mouse coordinates
    const mouse = { x: null, y: null, radius: 180 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        color: Math.random() > 0.35 ? "rgba(120, 86, 255, " : "rgba(54, 249, 246, ",
      });
    }

    // Helper to spawn a packet between two connected nodes
    const spawnPacket = (fromNode, toNode) => {
      packets.push({
        from: fromNode,
        to: toNode,
        progress: 0,
        speed: 0.005 + Math.random() * 0.01,
        color: fromNode.color.includes("54, 249") ? "#36f9f6" : "#7856ff",
      });
    };

    // Periodic packet spawning
    const packetSpawner = setInterval(() => {
      if (packets.length > 25) return; // Cap packets count

      // Find a random connected pair of nodes
      const index1 = Math.floor(Math.random() * nodes.length);
      const node1 = nodes[index1];
      const neighbors = [];

      for (let i = 0; i < nodes.length; i++) {
        if (i === index1) continue;
        const node2 = nodes[i];
        const dist = Math.hypot(node1.x - node2.x, node1.y - node2.y);
        if (dist < maxDistance) {
          neighbors.push(node2);
        }
      }

      if (neighbors.length > 0) {
        const node2 = neighbors[Math.floor(Math.random() * neighbors.length)];
        spawnPacket(node1, node2);
      }
    }, 400);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Draw connections (lines) between close nodes
      for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const node2 = nodes[j];
          const dist = Math.hypot(node1.x - node2.x, node1.y - node2.y);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(node1.x, node1.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.strokeStyle = `rgba(120, 86, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // 2. Draw connections to mouse
      if (mouse.x !== null) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const dist = Math.hypot(node.x - mouse.x, node.y - mouse.y);

          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.18;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(255, 121, 198, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();

            // Attract nodes slightly to mouse
            const force = (mouse.radius - dist) / mouse.radius;
            const angle = Math.atan2(mouse.y - node.y, mouse.x - node.x);
            node.x += Math.cos(angle) * force * 0.2;
            node.y += Math.sin(angle) * force * 0.2;
          }
        }
      }

      // 3. Update & Draw Packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          packets.splice(i, 1);
          continue;
        }

        // Interpolate position
        const px = p.from.x + (p.to.x - p.from.x) * p.progress;
        const py = p.from.y + (p.to.y - p.from.y) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      }

      // 4. Update & Draw Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move node
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > window.innerWidth) node.vx *= -1;
        if (node.y < 0 || node.y > window.innerHeight) node.vy *= -1;

        // Clamp inside screen bounds
        node.x = Math.max(0, Math.min(window.innerWidth, node.x));
        node.y = Math.max(0, Math.min(window.innerHeight, node.y));

        // Pulse size
        node.pulse += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulse) * 0.5;
        const currentAlpha = 0.3 + (Math.sin(node.pulse) + 1) * 0.25;

        // Draw node glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}${currentAlpha * 0.35})`;
        ctx.fill();

        // Draw core node
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}${currentAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(packetSpawner);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: -1,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
