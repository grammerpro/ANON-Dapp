import React, { useState } from "react";
import { ShieldCheck, HardDrive, Cpu, Radio, ChevronRight, Activity, FileDigit } from "lucide-react";
import NetworkTopology from "./NetworkTopology.jsx";

// Helper to format bytes
const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export default function Dashboard({ files, blockchain, wallet, onTabChange }) {
  const totalFiles = files.length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  // Take latest 3 blocks to display in audit feed
  const latestBlocks = [...blockchain]
    .sort((a, b) => b.index - a.index)
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* 1. Hero Title Section */}
      <div style={{ padding: "8px 0" }}>
        <h1 
          style={{ 
            fontSize: "36px", 
            fontWeight: "800", 
            letterSpacing: "-1px", 
            lineHeight: "1.2", 
            color: "var(--text-primary)", 
            marginBottom: "12px" 
          }}
        >
          Decentralized Storage Infrastructure
        </h1>
        <p 
          style={{ 
            fontSize: "16px", 
            lineHeight: "1.6", 
            color: "var(--text-secondary)", 
            maxWidth: "700px" 
          }}
        >
          Anchor encrypted shards to a secure, zero-knowledge peer mesh. Powered by client-side Web Crypto and block consensus verification.
        </p>
      </div>

      {/* 2. Hero: Living Network Topology Visualization */}
      <div className="hud-panel" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Radio size={15} style={{ color: "var(--accent-indigo)" }} /> LIVING NETWORK TOPOLOGY
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Real-time 60fps packet transmission and peer handshakes</span>
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent-emerald)" }} /> Uptime 99.98%</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent-blue)" }} /> Latency 44ms</span>
          </div>
        </div>
        
        {/* Living Topology Canvas Component */}
        <NetworkTopology />
      </div>

      {/* 3. Stat summaries card row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
        {/* Stat Item: Nodes */}
        <div className="hud-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>ACTIVE PEERS</span>
            <Radio size={14} style={{ color: "var(--accent-indigo)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            4 Cluster Nodes
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Simulating local gateway peers
          </div>
        </div>

        {/* Stat Item: Height */}
        <div className="hud-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>CONSENSUS HEIGHT</span>
            <Activity size={14} style={{ color: "var(--accent-emerald)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            Block #{blockchain.length - 1}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "6px" }}>
            Mined via Proof-of-Work algorithm
          </div>
        </div>

        {/* Stat Item: Space */}
        <div className="hud-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px" }}>VAULT CAPACITY</span>
            <HardDrive size={14} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
            {formatBytes(totalSize)}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "6px" }}>
            {totalFiles} Encrypted directory assets
          </div>
        </div>
      </div>

      {/* 4. Action portal and Activity Logs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Storage Quick Actions */}
        <div className="hud-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>INFRASTRUCTURE QUICK ACTIONS</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button 
              onClick={() => onTabChange("upload")}
              className="btn-neon"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span>Disperse Encrypted Shards</span>
              <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => onTabChange("vault")}
              className="btn-neon purple"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span>Browse File Vault Directory</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent Ledger Audit Trail */}
        <div className="hud-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={16} style={{ color: "var(--accent-emerald)" }} /> LEDGER CONSENSUS AUDITS
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {latestBlocks.map((block) => (
              <div 
                key={block.index} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  borderBottom: "1px solid var(--border-color)", 
                  paddingBottom: "10px" 
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                    {block.data.event === "GENESIS" ? "Protocol Genesis Mined" : block.data.event === "UPLOAD" ? "File Anchor Mined" : "Ledger Statement Mined"}
                  </span>
                  <span className="hash-pill" style={{ maxWidth: "160px" }}>
                    {block.hash}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--accent-indigo)" }}>
                    BLOCK #{block.index}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                    Nonce {block.nonce}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
