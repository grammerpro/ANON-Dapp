import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Cpu, Layers, Terminal, ChevronDown, ChevronUp, Database } from "lucide-react";
import { mineBlockWithProgress, saveBlock, getBlockchain } from "../utils/blockchainHelper.js";

// Helper to generate a session-based anonymous tag
const getAnonTag = (address) => {
  if (address) {
    return `Anon-${address.substring(2, 8).toUpperCase()}`;
  }
  let sessionTag = sessionStorage.getItem("anon_session_tag");
  if (!sessionTag) {
    sessionTag = `Node-${Math.floor(1000 + Math.random() * 9000)}`;
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

  // Sync chat messages from blockchain blocks
  useEffect(() => {
    const chatMsgs = blockchain
      .filter((block) => block.data && (block.data.event === "MESSAGE" || block.data.event === "UPLOAD"))
      .map((block) => ({
        id: block.hash,
        sender: block.data.sender || "System",
        text: block.data.message || (block.data.event === "UPLOAD" ? `Uploaded encrypted file: ${block.data.fileName} (${(block.data.size / 1024).toFixed(1)} KB)` : ""),
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

    // Setup next block details
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

    // Mine the block with difficulty 3 so it visualizes nicely (takes ~1-2 seconds)
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

      // Save block to DB and state
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
      console.error("Ledger mining failed:", error);
      setMiningStatus(null);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
      {/* Messaging Board Panel */}
      <div className="hud-panel" style={{ display: "flex", flexDirection: "column", height: "550px" }}>
        <div className="hud-corner-tag">anon chat // secure message ledger</div>
        
        {/* Chat Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(0, 243, 255, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare className="led-text" size={20} />
            <h2 className="led-text" style={{ fontSize: "16px" }}>SECURE MESSAGE BOARD</h2>
          </div>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            SENDER: <span className="led-text">{getAnonTag(walletAddress)}</span>
          </span>
        </div>

        {/* Message Log */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", background: "rgba(3,6,16,0.5)" }}>
          {messages.length === 0 && !miningStatus && (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", fontSize: "14px", fontFamily: "var(--font-mono)" }}>
              NO MESSAGES BROADCAST YET.<br />
              BE THE FIRST TO MINE A STATEMENT ONTO THE LEDGER.
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{
                alignSelf: msg.sender === getAnonTag(walletAddress) ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: msg.event === "UPLOAD" 
                  ? "rgba(189, 0, 255, 0.1)"
                  : msg.sender === getAnonTag(walletAddress) ? "rgba(0, 243, 255, 0.08)" : "rgba(30, 41, 59, 0.5)",
                border: msg.event === "UPLOAD"
                  ? "1px dashed rgba(189, 0, 255, 0.3)"
                  : msg.sender === getAnonTag(walletAddress) ? "1px solid rgba(0, 243, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "6px",
                padding: "10px 14px",
                position: "relative"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "4px", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                <span className={msg.event === "UPLOAD" ? "led-text purple" : msg.sender === getAnonTag(walletAddress) ? "led-text" : "led-text yellow"}>
                  {msg.sender}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  BLOCK #{msg.blockIndex} • {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-primary)", wordBreak: "break-word", lineHeight: "1.4" }}>
                {msg.text}
              </p>
            </div>
          ))}

          {/* Mining Visual Overlay */}
          {miningStatus && (
            <div 
              style={{
                alignSelf: "flex-end",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--neon-cyan)",
                borderRadius: "6px",
                padding: "14px",
                width: "280px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                boxShadow: "var(--glow-cyan)",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {miningStatus.stage === "mining" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Cpu size={16} className="animate-spin-slow led-text" />
                    <span className="led-text">MINING BLOCK ON-CHAIN...</span>
                  </div>
                  <div>NONCE: <span className="led-text">{miningStatus.nonce}</span></div>
                  <div style={{ 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    color: "var(--text-muted)", 
                    fontSize: "10px" 
                  }}>
                    HASH: {miningStatus.hash || "CALCULATING..."}
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "70%", background: "var(--neon-cyan)", animation: "scan-highlight 1.5s infinite" }} />
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--neon-green)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>[✓] BLOCK SUCCESSFULLY MINED</div>
                  <div style={{ fontSize: "10px" }}>NONCE: {miningStatus.nonce}</div>
                  <div style={{ fontSize: "10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    HASH: {miningStatus.hash}
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: "16px", borderTop: "1px solid rgba(0, 243, 255, 0.15)", display: "flex", gap: "10px", background: "var(--bg-secondary)" }}>
          <input
            type="text"
            className="input-neon"
            placeholder="Type anonymous message to mine onto the blockchain..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={miningStatus !== null}
          />
          <button type="submit" className="btn-neon" disabled={!inputText.trim() || miningStatus !== null}>
            <Send size={16} /> BROADCAST
          </button>
        </form>
      </div>

      {/* Blockchain Ledger Viewer toggle */}
      <div className="hud-panel" style={{ padding: "16px" }}>
        <button 
          onClick={() => setShowLedger(!showLedger)} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: "var(--neon-cyan)", 
            fontFamily: "var(--font-mono)", 
            fontSize: "14px", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            width: "100%", 
            justifyContent: "space-between" 
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={18} /> MOCK BLOCKCHAIN LEDGER DETAILS ({blockchain.length} BLOCKS)
          </span>
          {showLedger ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showLedger && (
          <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.5" }}>
              Every data state update (file upload, message broadcast) is cryptographically signed and added to a local peer-to-peer simulated ledger using Proof-of-Work hashing. Click a block to audit its raw contents.
            </p>

            {/* Block Node Chain */}
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "10px 0" }}>
              {[...blockchain].reverse().map((block, idx) => (
                <div 
                  key={block.index} 
                  onClick={() => setSelectedBlock(block)}
                  style={{
                    flexShrink: 0,
                    width: "140px",
                    background: selectedBlock?.index === block.index ? "rgba(0, 243, 255, 0.15)" : "rgba(8, 14, 38, 0.7)",
                    border: selectedBlock?.index === block.index ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>BLOCK</span>
                    <span className="led-text">#{block.index}</span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "600", margin: "6px 0", color: block.data.event === "GENESIS" ? "var(--neon-green)" : block.data.event === "UPLOAD" ? "var(--neon-purple)" : "var(--neon-yellow)" }}>
                    {block.data.event || "GENESIS"}
                  </div>
                  <div style={{ 
                    fontSize: "8px", 
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

            {/* Block Inspector */}
            {selectedBlock && (
              <div 
                style={{ 
                  background: "rgba(5, 8, 20, 0.9)", 
                  border: "1px solid rgba(0, 243, 255, 0.2)", 
                  borderRadius: "6px", 
                  padding: "16px", 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "12px",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(0, 243, 255, 0.1)", paddingBottom: "6px" }}>
                  <span className="led-text">AUDITING BLOCK #{selectedBlock.index}</span>
                  <button 
                    onClick={() => setSelectedBlock(null)}
                    style={{ background: "transparent", border: "none", color: "var(--neon-pink)", cursor: "pointer" }}
                  >
                    CLOSE AUDIT
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                  <div><span style={{ color: "var(--text-muted)" }}>[index]</span> {selectedBlock.index}</div>
                  <div><span style={{ color: "var(--text-muted)" }}>[timestamp]</span> {new Date(selectedBlock.timestamp).toLocaleString()} ({selectedBlock.timestamp})</div>
                  <div><span style={{ color: "var(--text-muted)" }}>[previous_hash]</span> <span style={{ color: "var(--text-secondary)" }}>{selectedBlock.prevHash}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>[block_hash]</span> <span className="led-text">{selectedBlock.hash}</span></div>
                  <div><span style={{ color: "var(--text-muted)" }}>[nonce]</span> {selectedBlock.nonce}</div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>[payload]</span>
                    <pre style={{ 
                      background: "rgba(0,0,0,0.3)", 
                      padding: "8px", 
                      borderRadius: "4px", 
                      marginTop: "4px", 
                      fontSize: "11px",
                      color: "var(--neon-green)",
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
