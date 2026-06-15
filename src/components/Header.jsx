import React from "react";
import { Server, Wallet, Activity } from "lucide-react";

export default function Header({ activeTab, onTabChange, wallet, onConnectWallet, blockchainLength }) {
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header 
      className="hud-panel" 
      style={{ 
        padding: "16px 28px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap",
        gap: "20px",
        marginBottom: "32px",
        background: "rgba(15, 22, 42, 0.4)",
        borderColor: "var(--border-color)",
        borderRadius: "16px"
      }}
    >
      {/* Brand Identity */}
      <div 
        onClick={() => onTabChange("dashboard")}
        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <Server size={18} style={{ color: "var(--accent-indigo)" }} />
        <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "1.5px", color: "var(--text-primary)" }}>
          ANON
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500", letterSpacing: "1px" }}>
          // STORAGE NETWORK
        </span>
      </div>

      {/* Center Tabs */}
      <nav style={{ display: "flex", gap: "8px" }}>
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "upload", label: "Upload" },
          { id: "vault", label: "Vault Directory" },
          { id: "chat", label: "Consensus Ledger" },
          { id: "settings", label: "Settings" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                background: isActive ? "rgba(255, 255, 255, 0.05)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                borderRadius: "8px",
                fontFamily: "var(--font-main)",
                fontSize: "13px",
                fontWeight: isActive ? "500" : "400",
                padding: "8px 16px",
                cursor: "pointer",
                transition: "all 200ms var(--ease-in-out)"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Wallet Connection Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Ledger height indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
          <Activity size={14} style={{ color: "var(--accent-emerald)" }} />
          <span>Block: <strong className="led-text green">#{blockchainLength - 1}</strong></span>
        </div>

        {wallet.connected ? (
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              background: "rgba(255, 255, 255, 0.04)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12.5px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)"
            }}
          >
            <span 
              style={{ 
                display: "inline-block", 
                width: "6px", 
                height: "6px", 
                background: "var(--accent-emerald)", 
                borderRadius: "50%" 
              }} 
            />
            <span>{formatAddress(wallet.address)}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>({wallet.balance} ETH)</span>
          </div>
        ) : (
          <button 
            onClick={onConnectWallet} 
            className="btn-neon purple" 
            style={{ 
              padding: "8px 16px", 
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Wallet size={13} /> Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
