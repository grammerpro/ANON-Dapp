import React, { useState, useEffect } from "react";
import CanvasBackdrop from "./components/CanvasBackdrop.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./components/Dashboard.jsx";
import UploadPortal from "./components/UploadPortal.jsx";
import FileVault from "./components/FileVault.jsx";
import SharePortal from "./components/SharePortal.jsx";
import AnonChat from "./components/AnonChat.jsx";
import Settings from "./components/Settings.jsx";

import { initBlockchain } from "./utils/blockchainHelper.js";
import { getAllLocalFiles } from "./utils/ipfsHelper.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isShareView, setIsShareView] = useState(window.location.hash.startsWith("#/share/"));
  
  // App-wide data states
  const [files, setFiles] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [pinataJwt, setPinataJwt] = useState(localStorage.getItem("anon_pinata_jwt") || "");
  
  // Wallet states
  const [wallet, setWallet] = useState({ connected: false, address: null, balance: "0.00" });

  // Handle zero-knowledge share portal routing via window hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setIsShareView(window.location.hash.startsWith("#/share/"));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Initialize ledger blocks and fetch local pinned files on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const chain = await initBlockchain();
        setBlockchain(chain);

        const localFiles = await getAllLocalFiles();
        setFiles(localFiles.sort((a, b) => b.uploadedAt - a.uploadedAt));
      } catch (err) {
        console.error("Database connection bootstrap failure:", err);
      }
    };
    bootstrap();
  }, []);

  // Check and listen to real Web3 wallets (MetaMask)
  useEffect(() => {
    if (window.ethereum) {
      // Reconnect if accounts are already unlocked
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          handleWalletConnected(accounts[0]);
        }
      });

      const handleAccounts = (accounts) => {
        if (accounts && accounts.length > 0) {
          handleWalletConnected(accounts[0]);
        } else {
          setWallet({ connected: false, address: null, balance: "0.00" });
        }
      };

      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  const handleWalletConnected = async (address) => {
    try {
      const balanceHex = await window.ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"]
      });
      const balanceEth = (parseInt(balanceHex, 16) / 1e18).toFixed(4);
      setWallet({ connected: true, address, balance: balanceEth });
    } catch (e) {
      console.error("Failed to query MetaMask account balance:", e);
      setWallet({ connected: true, address, balance: "0.0000" });
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          handleWalletConnected(accounts[0]);
        }
      } catch (err) {
        console.error("User rejected wallet sign-in requests:", err);
      }
    } else {
      // Mock Wallet Profile Fallback
      if (window.confirm("METAMASK EXTENSION NOT RUNNING.\n\nConnect a simulated secure mock anonymous wallet profile to interact with the blockchain node?")) {
        const mockAddress = "0x" + Array.from({ length: 40 }, () => 
          "0123456789abcdef"[Math.floor(Math.random() * 16)]
        ).join("");
        const mockBalance = (Math.random() * 4 + 1).toFixed(4);
        setWallet({ connected: true, address: mockAddress, balance: mockBalance });
      }
    }
  };

  const handleClearDb = () => {
    const DB_NAME = "AnonDappDB";
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.hash = "";
      window.location.reload();
    };
    
    request.onerror = () => {
      alert("Failed to purge the IndexedDB node database.");
    };
  };

  const refreshFilesList = async () => {
    const all = await getAllLocalFiles();
    setFiles(all.sort((a, b) => b.uploadedAt - a.uploadedAt));
  };

  return (
    <>
      {/* 3D-Like Node Network Canvas Backdrop */}
      <CanvasBackdrop />

      {/* Cyber Grid Pattern & Ambient Nebula Colors */}
      <div className="cyber-grid" />
      <div className="ambient-nebula-cyan" />
      <div className="ambient-nebula-purple" />
      
      {/* Scanning lines */}
      <div className="scanlines" />

      {/* Core UI Container */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", position: "relative", zIndex: 1 }}>
        {isShareView ? (
          <SharePortal 
            pinataJwt={pinataJwt} 
            onGoHome={() => {
              window.location.hash = "";
              setIsShareView(false);
              setActiveTab("dashboard");
            }} 
          />
        ) : (
          <>
            {/* HUD Header Bar */}
            <Header 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              wallet={wallet} 
              onConnectWallet={connectWallet}
              blockchainLength={blockchain.length}
            />

            {/* Main Content Layout */}
            <main style={{ minHeight: "500px" }}>
              {activeTab === "dashboard" && (
                <Dashboard 
                  files={files} 
                  blockchain={blockchain} 
                  wallet={wallet} 
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === "upload" && (
                <UploadPortal 
                  pinataJwt={pinataJwt} 
                  blockchain={blockchain} 
                  setBlockchain={setBlockchain}
                  onUploadSuccess={refreshFilesList}
                />
              )}

              {activeTab === "vault" && (
                <FileVault 
                  files={files} 
                  setFiles={setFiles}
                  pinataJwt={pinataJwt}
                />
              )}

              {activeTab === "chat" && (
                <AnonChat 
                  blockchain={blockchain} 
                  setBlockchain={setBlockchain}
                  walletAddress={wallet.address}
                />
              )}

              {activeTab === "settings" && (
                <Settings 
                  pinataJwt={pinataJwt} 
                  setPinataJwt={setPinataJwt}
                  onClearDb={handleClearDb}
                />
              )}
            </main>
          </>
        )}

        {/* Global HUD Footer */}
        <footer 
          style={{ 
            marginTop: "50px", 
            padding: "20px 0 10px 0", 
            textAlign: "center", 
            fontSize: "11px", 
            fontFamily: "var(--font-mono)", 
            color: "var(--text-muted)", 
            borderTop: "1px solid rgba(0, 243, 255, 0.08)",
            letterSpacing: "1px" 
          }}
        >
          ANON_DAPP // PEER CLIENT NODE ENABLED // PROTOCOL v1.2.0 // DECENTRALIZED FILE PORTAL SECURED
        </footer>
      </div>
    </>
  );
}
