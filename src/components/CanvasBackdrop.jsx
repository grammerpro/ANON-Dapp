import React, { useEffect, useRef } from "react";

export default function CanvasBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

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

    // Highly reduced node count for subtle background texturing
    const nodeCount = 30;
    const nodes = [];
    const maxDistance = 200; // longer connections, but fainter

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.08, // 5x slower, calm motion
        vy: (Math.random() - 0.5) * 0.08,
        radius: Math.random() * 0.8 + 0.4, // ultra thin nodes
      });
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw faint connections
      for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];

        for (let j = i + 1; j < nodes.length; j++) {
          const node2 = nodes[j];
          const dist = Math.hypot(node1.x - node2.x, node1.y - node2.y);

          if (dist < maxDistance) {
            // Faint, almost invisible line connection opacity (max 0.03)
            const alpha = (1 - dist / maxDistance) * 0.035;
            ctx.beginPath();
            ctx.moveTo(node1.x, node1.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        node.x += node.vx;
        node.y += node.vy;

        // Wrap around bounds for a continuous flow
        if (node.x < 0) node.x = window.innerWidth;
        if (node.x > window.innerWidth) node.x = 0;
        if (node.y < 0) node.y = window.innerHeight;
        if (node.y > window.innerHeight) node.y = 0;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
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
        opacity: 0.8
      }}
    />
  );
}
