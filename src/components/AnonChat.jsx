import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Cpu, Layers, Terminal, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { mineBlockWithProgress, saveBlock, getBlockchain } from "../utils/blockchainHelper.js";

const getAnonTag = (address) => {
  if (address) {
    return `Peer-${address.substring(2, 8).toUpperCase()}`;
  }
  let sessionTag = sessionStorage.getItem("anon_session_tag");
  if (!sessionTag) {
    sessionTag = `Gateway-Node-${Math.floor(1000 + Math.random() * 9000)}`;
    sessionStorage.setItem("anon_session_tag", sessionTag);
  }
  return sessionTag;
};

export default function AnonChat({ blockchain, setBlockchain, walletAddress }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [miningStatus, setMiningStatus] = useState(null); // { nonce, hash, stage: 'idle' | 'mining' | 'success' }
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showLedger, setShowLedger] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const chatMsgs = blockchain
      .filter((block) => block.data && (block.data.event === "MESSAGE" || block.data.event === "UPLOAD"))
      .map((block) => ({
        id: block.hash,
        sender: block.data.sender || "System consensus",
        text: block.data.message || (block.data.event === "UPLOAD" ? `Dispersed encrypted asset: ${block.data.fileName} (${(block.data.size / 1024).toFixed(1)} KB)` : ""),
        timestamp: block.timestamp,
        blockIndex: block.index,
        event: block.data.event,
        hash: block.hash
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    setMessages(chatMsgs);
  }, [blockchain]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, miningStatus]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const senderTag = getAnonTag(walletAddress);
    const textToSend = inputText.trim();
    setInputText("");

    const sorted = [...blockchain].sort((a, b) => b.index - a.index);
    const latestBlock = sorted[0];
    const nextIndex = latestBlock.index + 1;
    const prevHash = latestBlock.hash;
    const blockData = {
      event: "MESSAGE",
      sender: senderTag,
      message: textToSend
    };

    setMiningStatus({ nonce: 0, hash: "", stage: "mining" });

    try {
      const minedBlock = await mineBlockWithProgress(
        nextIndex,
        prevHash,
        blockData,
        3, // difficulty
        (progress) => {
          setMiningStatus((prev) => ({
            ...prev,
            nonce: progress.nonce,
            hash: progress.hash
          }));
        }
      );

      await saveBlock(minedBlock);
      const updatedChain = await getBlockchain();
      setBlockchain(updatedChain.sort((a, b) => a.index - b.index));
      
      setMiningStatus({
        nonce: minedBlock.nonce,
        hash: minedBlock.hash,
        stage: "success"
      });

      setTimeout(() => {
        setMiningStatus(null);
      }, 1500);

    } catch (error) {
      console.error("Ledger write failed:", error);
      setMiningStatus(null);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      {/* Messages Panel */}
      <div className="hud-panel" style={{ display: "flex", flexDirection: "column", height: "540px" }}>
        
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare size={16} style={{ color: "var(--accent-indigo)" }} />
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Consensus Messaging Ledger</h2>
          </div>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            Sender: <span style={{ color: "var(--accent-blue)" }}>{getAnonTag(walletAddress)}</span>
          </span>
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(15,22,42,0.15)" }}>
          {messages.length === 0 && !miningStatus && (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: "1.6" }}>
              No messages broadcasted yet.<br />
              Submit a statement to mine a new consensus block.
            </div>
          )}

          {messages.map((msg) => {
            const isSelf = msg.sender === getAnonTag(walletAddress);
            return (
              <div 
                key={msg.id} 
                style={{
                  alignSelf: isSelf ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  background: msg.event === "UPLOAD" 
                    ? "rgba(99, 102, 241, 0.05)"
                    : isSelf ? "rgba(255, 255, 255, 0.02)" : "rgba(15, 22, 42, 0.4)",
                  border: msg.event === "UPLOAD"
                    ? "1px dashed rgba(99, 102, 241, 0.25)"
                    : "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "12px 16px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "6px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: isSelf ? "var(--accent-blue)" : "var(--text-primary)" }}>
                    {msg.sender}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Block #{msg.blockIndex} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ fontSize: "13.5px", color: "var(--text-primary)", wordBreak: "break-word", lineHeight: "1.5" }}>
                  {msg.text}
                </p>
              </div>
            );
          })}

          {/* Mining Visual Overlay */}
          {miningStatus && (
            <div 
              style={{
                alignSelf: "flex-end",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "16px",
                width: "280px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "var(--shadow-md)"
              }}
            >
              {miningStatus.stage === "mining" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-indigo)" }}>
                    <Cpu size={14} className="led-text" style={{ animation: "spin-slow 2s linear infinite" }} />
                    <span>Mining block...</span>
                  </div>
                  <div>Nonce check: <span style={{ color: "white" }}>{miningStatus.nonce}</span></div>
                  <div style={{ 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    color: "var(--text-secondary)", 
                    fontSize: "10.5px" 
                  }}>
                    Hash: {miningStatus.hash || "calculating..."}
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--accent-emerald)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={14} />
                    <span>Block Anchored</span>
                  </div>
                  <div style={{ fontSize: "10.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Hash: {miningStatus.hash}
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} style={{ padding: "18px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", background: "rgba(15,22,42,0.2)" }}>
          <input
            type="text"
            className="input-neon"
            placeholder="Broadcast transaction statement onto the consensus chain..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={miningStatus !== null}
          />
          <button type="submit" className="btn-neon" disabled={!inputText.trim() || miningStatus !== null}>
            Broadcast
          </button>
        </form>
      </div>

      {/* Blockchain Details Section */}
      <div className="hud-panel" style={{ padding: "20px 24px" }}>
        <button 
          onClick={() => setShowLedger(!showLedger)} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: "var(--text-primary)", 
            fontFamily: "var(--font-main)", 
            fontSize: "13.5px", 
            fontWeight: "600",
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            width: "100%", 
            justifyContent: "space-between" 
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={16} style={{ color: "var(--accent-indigo)" }} /> Blockchain Ledger Sync ({blockchain.length} blocks)
          </span>
          {showLedger ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showLedger && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
              Every network update is compiled and verified in a mock local consensus ledger. Click a block below to audit its cryptographic details.
            </p>

            {/* Block Chain Grid */}
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "10px 0" }}>
              {[...blockchain].reverse().map((block) => (
                <div 
                  key={block.index} 
                  onClick={() => setSelectedBlock(block)}
                  style={{
                    flexShrink: 0,
                    width: "140px",
                    background: selectedBlock?.index === block.index ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.01)",
                    border: selectedBlock?.index === block.index ? "1px solid var(--accent-indigo)" : "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 200ms"
                  }}
                >
                  <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                    <span>BLOCK</span>
                    <span style={{ color: "white", fontWeight: "600" }}>#{block.index}</span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "600", margin: "6px 0", color: block.data.event === "GENESIS" ? "var(--accent-emerald)" : block.data.event === "UPLOAD" ? "var(--accent-indigo)" : "var(--accent-blue)" }}>
                    {block.data.event || "GENESIS"}
                  </div>
                  <div style={{ 
                    fontSize: "8.5px", 
                    fontFamily: "var(--font-mono)", 
                    color: "var(--text-secondary)", 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis" 
                  }}>
                    {block.hash}
                  </div>
                </div>
              ))}
            </div>

            {/* Audit Inspector Panel */}
            {selectedBlock && (
              <div 
                style={{ 
                  background: "rgba(15, 22, 42, 0.4)", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "8px", 
                  padding: "20px", 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "12.5px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                  <span style={{ color: "white", fontWeight: "600" }}>Auditing Block #{selectedBlock.index}</span>
                  <button 
                    onClick={() => setSelectedBlock(null)}
                    style={{ background: "transparent", border: "none", color: "var(--accent-rose)", cursor: "pointer" }}
                  >
                    Close Audit
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div><span style={{ color: "var(--text-secondary)" }}>index:</span> {selectedBlock.index}</div>
                  <div><span style={{ color: "var(--text-secondary)" }}>timestamp:</span> {new Date(selectedBlock.timestamp).toLocaleString()}</div>
                  <div><span style={{ color: "var(--text-secondary)" }}>previous_hash:</span> <span style={{ color: "var(--text-muted)" }}>{selectedBlock.prevHash}</span></div>
                  <div><span style={{ color: "var(--text-secondary)" }}>block_hash:</span> <span className="led-text">{selectedBlock.hash}</span></div>
                  <div><span style={{ color: "var(--text-secondary)" }}>nonce:</span> {selectedBlock.nonce}</div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>payload:</span>
                    <pre style={{ 
                      background: "rgba(0,0,0,0.15)", 
                      padding: "10px", 
                      borderRadius: "6px", 
                      marginTop: "6px", 
                      fontSize: "11px",
                      color: "var(--accent-emerald)",
                      overflowX: "auto"
                    }}>
                      {JSON.stringify(selectedBlock.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
