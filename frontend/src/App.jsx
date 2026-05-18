import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, Shield, Zap, Award, Flame, Send, Settings, User, 
  Play, Pause, RefreshCw, AlertCircle, Sparkles, Check, 
  HelpCircle, Eye, EyeOff, Trophy, Volume2
} from "lucide-react";

export default function App() {
  // Connection and configuration state
  const [username, setUsername] = useState(() => localStorage.getItem("apl_username") || "You");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Match State from server
  const [match, setMatch] = useState({
    team_a: "India",
    team_b: "Australia",
    runs: 138,
    wickets: 3,
    overs: 14.0,
    target: 188,
    batters: [
      { name: "Virat Kohli", runs: 54, balls: 38, fours: 5, sixes: 1, is_striker: true },
      { name: "Hardik Pandya", runs: 14, balls: 10, fours: 1, sixes: 1, is_striker: false }
    ],
    bowler: { name: "Pat Cummins", overs: 2.0, runs: 18, wickets: 1, balls_bowled: 12 },
    last_balls: ["1", "6", "0", "W", "4", "1"],
    win_probability_a: 52,
    win_probability_b: 48,
    win_probability_explanation: "India needs 50 runs off 36 balls. Kohli is anchoring, but Cummins is bowling tight.",
    commentary: "Welcome to the second-screen experience of the Agentic Premier League!",
    active_poll: null,
    chase_mode: false,
    match_active: true,
    auto_simulate: false,
    dismissed_player_stat: "",
    leaderboard: []
  });

  // App Client States
  const [wsConnected, setWsConnected] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingFeedback, setVotingFeedback] = useState("");
  const [lastEventMessage, setLastEventMessage] = useState("");
  const [recentNotification, setRecentNotification] = useState("");
  const [socketAttempts, setSocketAttempts] = useState(0);

  const socketRef = useRef(null);

  // Sync username to local storage
  const handleSaveUsername = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      localStorage.setItem("apl_username", tempUsername.trim());
      setIsEditingUsername(false);
      triggerNotification("Username updated to " + tempUsername.trim() + "!");
      // Refetch stats to sync user points name in backend
      sendPrediction(tempUsername.trim(), -1); 
    }
  };

  // Helper to trigger floating visual notifications
  const triggerNotification = (msg) => {
    setRecentNotification(msg);
    setTimeout(() => {
      setRecentNotification("");
    }, 5000);
  };

  // Connect to WebSockets
  const connectWebSocket = () => {
    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Automatically construct WebSocket URL based on window host
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//127.0.0.1:8000/ws`;
      
      console.log("Connecting to WebSocket:", wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket Connected!");
        setWsConnected(true);
        setSocketAttempts(0);
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        console.log("Received WebSocket Event:", payload);
        
        if (payload.type === "INIT_STATE" || payload.type === "STATE_UPDATE" || payload.type === "MATCH_FINISHED") {
          const oldState = match;
          const newState = payload.data;
          
          setMatch(newState);

          // Alert on key triggers like Wicket, Boundary, or Chase Mode
          if (newState.runs > oldState.runs && (newState.runs - oldState.runs) === 6) {
            triggerNotification("💥 SIX HIT! Gemini Host is generating commentary!");
          } else if (newState.wickets > oldState.wickets) {
            triggerNotification("🔴 WICKET FALLS! Check out the dismissed player stats!");
          } else if (newState.chase_mode && !oldState.chase_mode) {
            triggerNotification("🔥 CHASE MODE ENGAGED! Last 5 overs remain!");
          }

          // If a new poll gets triggered and active, reset voting state
          if (
            newState.active_poll && 
            (!oldState.active_poll || oldState.active_poll.question !== newState.active_poll.question)
          ) {
            setHasVoted(false);
            setVotedOption(null);
            setVotingFeedback("");
            triggerNotification("⚡ NEW FAN POLL AUTOTRIGGERED BY GEMINI!");
          }
        }
      };

      socket.onclose = () => {
        console.log("WebSocket Disconnected. Reconnecting in 3s...");
        setWsConnected(false);
        // Retry limit to prevent infinite spinning
        if (socketAttempts < 10) {
          setTimeout(() => {
            setSocketAttempts(prev => prev + 1);
            connectWebSocket();
          }, 3000);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setWsConnected(false);
      };

    } catch (e) {
      console.error(e);
      setWsConnected(false);
    }
  };

  // HTTP Polling Fallback just in case WS fails
  useEffect(() => {
    connectWebSocket();
    
    // Fallback polling every 4 seconds
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetch("http://127.0.0.1:8000/api/state")
          .then(res => res.json())
          .then(data => {
            setMatch(data);
          })
          .catch(err => console.log("HTTP Polling Error:", err));
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.close();
    };
  }, [wsConnected]);

  // Handle Gemini API Key Configuration
  const submitApiKey = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/config-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey })
      });
      const data = await response.json();
      if (data.status === "success") {
        localStorage.setItem("gemini_api_key", apiKey);
        setApiKeyStatus("✅ Key applied successfully!");
        triggerNotification("Gemini Agent fully re-loaded with your API key!");
        setTimeout(() => setApiKeyStatus(""), 4000);
      }
    } catch (e) {
      setApiKeyStatus("❌ Failed to configure key.");
    }
  };

  // Submit Fan Prediction
  const sendPrediction = async (user, optIdx) => {
    if (optIdx === -1) {
      // Just a dummy predict to register user in leaderboard
      try {
        await fetch("http://127.0.0.1:8000/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, option_index: 0 })
        });
      } catch(e) {}
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, option_index: optIdx })
      });
      const data = await response.json();
      if (response.ok) {
        setHasVoted(true);
        setVotedOption(optIdx);
        setVotingFeedback(data.message);
        triggerNotification("🌟 Prediction submitted successfully! +10 Points");
      } else {
        triggerNotification("⚠️ " + data.detail);
      }
    } catch (e) {
      triggerNotification("⚠️ Failed to submit prediction.");
    }
  };

  // Run Manual Match Event Simulation
  const simulateEvent = async (event) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event })
      });
      const data = await response.json();
      if (response.ok) {
        setLastEventMessage(data.message);
        setTimeout(() => setLastEventMessage(""), 4000);
      }
    } catch (e) {
      triggerNotification("⚠️ Simulation failed.");
    }
  };

  // Math Helper
  const runsNeeded = match.target - match.runs;
  const ballsRemaining = 120 - Math.floor(match.overs * 6) - (Math.floor((match.overs % 1) * 10));
  const currentRR = match.overs > 0 ? (match.runs / match.overs).toFixed(2) : "0.00";
  const requiredRR = ballsRemaining > 0 ? ((runsNeeded / (ballsRemaining / 6))).toFixed(2) : "0.00";
  const striker = match.batters.find(b => b.is_striker) || match.batters[0];
  const nonStriker = match.batters.find(b => !b.is_striker) || match.batters[1];

  // User Stats lookup in leaderboard
  const userStats = match.leaderboard.find(u => u.username.toLowerCase() === username.toLowerCase()) || { points: 0, rank: "--" };

  return (
    <div className="min-h-screen bg-grid-pattern relative">
      {/* Stadium Top Lights Glow Overlay */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-stadium-neon/10 to-transparent pointer-events-none z-0" />

      {/* Floating Notification */}
      {recentNotification && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 glass-panel border border-stadium-neon px-5 py-3 rounded-full flex items-center gap-3 animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <Sparkles className="w-5 h-5 text-neon-gold" />
          <span className="text-white font-medium text-sm tracking-wide">{recentNotification}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-pitch-light/50 sticky top-0 bg-pitch-dark/85 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stadium-neon to-pitch-light flex items-center justify-center border border-stadium-neon/40 shadow-inner">
              <Tv className="w-5.5 h-5.5 text-white ball-float" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stadium-neon/15 text-stadium-neon border border-stadium-neon/30">Google Cloud</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neon-gold text-pitch-dark">DEMO</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">Build with AI – <span className="text-stadium-neon">Agentic Premier League</span></h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pitch-medium border border-pitch-light text-xs font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-stadium-neon pulse-indicator" : "bg-wicket-pink animate-pulse"}`} />
              <span className="text-gray-300">{wsConnected ? "Live Feed Sync" : "Poller Sync"}</span>
            </div>

            {/* Profile Pill */}
            <div className="flex items-center gap-2">
              {isEditingUsername ? (
                <div className="flex items-center gap-1.5 bg-pitch-medium px-2 py-1 rounded-lg border border-pitch-light">
                  <input 
                    type="text" 
                    value={tempUsername} 
                    onChange={(e) => setTempUsername(e.target.value)}
                    maxLength={14}
                    className="bg-transparent text-white text-xs outline-none w-20 px-1 font-semibold"
                  />
                  <button onClick={handleSaveUsername} className="p-1 rounded bg-stadium-neon text-pitch-dark hover:scale-105 transition">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setTempUsername(username); setIsEditingUsername(true); }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-pitch-medium hover:bg-pitch-light border border-pitch-light/60 text-xs font-semibold text-gray-200 transition-all hover:border-stadium-neon/35"
                >
                  <User className="w-3.5 h-3.5 text-stadium-neon" />
                  <span>{username}</span>
                  <span className="text-[10px] text-neon-gold bg-neon-gold/15 px-1.5 py-0.5 rounded border border-neon-gold/20 font-bold">{userStats.points} pts</span>
                </button>
              )}
            </div>

            {/* Settings Trigger */}
            <button 
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`p-2 rounded-lg border transition-all ${showKeyConfig ? "bg-stadium-neon text-pitch-dark border-stadium-neon" : "bg-pitch-medium text-gray-400 hover:text-white border-pitch-light hover:border-stadium-neon/45"}`}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Gemini API Configuration Overlay */}
      {showKeyConfig && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-40">
          <div className="glass-panel border-stadium-neon/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-stadium-neon/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-neon-gold" />
                  <h3 className="text-sm font-bold text-white tracking-wide">Configure Live Gemini API Agent</h3>
                </div>
                <button 
                  onClick={() => setShowKeyConfig(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded bg-pitch-light hover:bg-pitch-medium border border-pitch-light"
                >
                  Close Panel
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                Paste your Google Gemini API Key to enable the **Autonomous Live Analyst Host**. Gemini will instantly compose witty commentary, update win probabilities with custom tactical reasons, and write cricket poll questions! If left empty, our intelligent offline fallback engine takes over seamlessly.
              </p>
              <div className="flex flex-wrap gap-2.5 items-center mt-1.5">
                <div className="flex-1 min-w-[280px] relative bg-pitch-dark border border-pitch-light rounded-lg overflow-hidden focus-within:border-stadium-neon/60 transition-all">
                  <input 
                    type={showApiKeyInput ? "text" : "password"}
                    placeholder="Enter GEMINI_API_KEY..." 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-transparent text-white px-3 py-2 text-xs font-mono outline-none pr-10"
                  />
                  <button 
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button 
                  onClick={submitApiKey}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-stadium-neon to-emerald-600 hover:to-stadium-neon text-pitch-dark font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  Save API Key
                </button>
              </div>
              {apiKeyStatus && (
                <div className="text-xs font-medium text-neon-gold mt-1 animate-pulse">
                  {apiKeyStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Match Center & AI commentary */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* LIVE SCOREBOARD CARD */}
            <div className={`glass-panel rounded-2xl overflow-hidden glass-panel-glow border-t-2 relative transition-all duration-500 ${match.chase_mode ? "border-t-wicket-pink shadow-[0_0_35px_rgba(244,63,94,0.1)]" : "border-t-stadium-neon shadow-lg"}`}>
              
              {/* Scoreboard Header */}
              <div className="px-5 py-3.5 bg-pitch-medium/60 border-b border-pitch-light/35 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${match.match_active ? "bg-stadium-neon pulse-indicator" : "bg-gray-500"}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stadium-neon">Live Match Center</span>
                </div>
                <div className="text-xs font-semibold text-gray-400">
                  Target Chase: <span className="text-white font-mono">{match.target} runs</span>
                </div>
              </div>

              {/* Main Score Display Area */}
              <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-pitch-light/35 relative">
                {/* Visual Chase Mode Overlay */}
                {match.chase_mode && (
                  <div className="absolute top-2 right-2 bg-wicket-pink/15 border border-wicket-pink/30 text-wicket-pink text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                    🚨 Chase Mode Active (Last 5 Overs)
                  </div>
                )}

                {/* Score Section */}
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl font-extrabold text-white tracking-tight font-display">{match.team_a}</span>
                    <span className="text-lg text-gray-400 font-semibold font-display">vs {match.team_b}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-3 mt-1.5">
                    <span className="text-5xl font-extrabold text-white tracking-tighter font-mono neon-score">
                      {match.runs}<span className="text-gray-400">/</span>{match.wickets}
                    </span>
                    <span className="text-lg text-gray-300 font-mono font-semibold">
                      ({match.overs} overs)
                    </span>
                  </div>
                </div>

                {/* Live Stats Quick Pill */}
                <div className="flex flex-col items-center sm:items-end gap-2 bg-pitch-dark/55 border border-pitch-light/50 p-4 rounded-xl min-w-[160px] shadow-inner">
                  <div className="text-center sm:text-right">
                    <div className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400">Runs Needed</div>
                    <div className="text-2xl font-bold font-mono text-neon-gold tracking-tight">{runs_needed} runs</div>
                    <div className="text-[10px] text-gray-300 font-medium font-mono mt-0.5">from {ballsRemaining} deliveries</div>
                  </div>
                  <div className="w-full h-px bg-pitch-light/35 my-0.5" />
                  <div className="flex justify-between w-full text-xs font-mono text-gray-400 px-1">
                    <span>CRR: <strong className="text-white font-medium">{currentRR}</strong></span>
                    <span>RRR: <strong className="text-wicket-pink font-medium">{requiredRR}</strong></span>
                  </div>
                </div>
              </div>

              {/* Batters & Bowler Table Details */}
              <div className="p-5 flex flex-col md:flex-row gap-5 border-b border-pitch-light/35 bg-pitch-medium/25">
                
                {/* Batters Section */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-stadium-neon mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Batting Striker
                  </div>
                  <div className="flex flex-col gap-2">
                    {match.batters.map((b, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${b.is_striker ? "bg-stadium-neon/10 border-stadium-neon/35 shadow-[0_0_12px_rgba(16,185,129,0.06)]" : "bg-pitch-dark/30 border-pitch-light/40"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${b.is_striker ? "bg-stadium-neon pulse-indicator" : "bg-transparent"}`} />
                          <span className={`text-xs font-bold ${b.is_striker ? "text-white" : "text-gray-400"}`}>
                            {b.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-white font-extrabold">{b.runs}<span className="text-[10px] text-gray-400 font-normal">({b.balls})</span></span>
                          <div className="text-gray-400 flex gap-2.5 text-[10px]">
                            <span>4s: <strong className="text-gray-200">{b.fours}</strong></span>
                            <span>6s: <strong className="text-gray-200">{b.sixes}</strong></span>
                            <span className="hidden sm:inline">SR: <strong className="text-stadium-neon font-medium">{b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(1) : "0.0"}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bowler Section */}
                <div className="md:w-1/3 flex flex-col gap-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Bowler
                  </div>
                  <div className="p-3 rounded-xl bg-pitch-dark/45 border border-pitch-light/50 flex flex-col justify-center h-full gap-1 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{match.bowler.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pitch-light text-gray-300 font-semibold">{match.bowler.overs} overs</span>
                    </div>
                    <div className="w-full h-px bg-pitch-light/35 my-1.5" />
                    <div className="flex justify-between text-[11px] font-mono text-gray-400">
                      <span>Runs: <strong className="text-white">{match.bowler.runs}</strong></span>
                      <span>Wickets: <strong className="text-wicket-pink font-bold">{match.bowler.wickets}</strong></span>
                      <span>Econ: <strong className="text-neon-gold">{match.bowler.overs > 0 ? (match.bowler.runs / match.bowler.overs).toFixed(2) : "0.00"}</strong></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Scoreboard Footer: Recent Balls */}
              <div className="px-5 py-3.5 bg-pitch-medium/40 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400">Recent Balls (This Over)</div>
                <div className="flex gap-2">
                  {match.last_balls.map((b, idx) => {
                    let pillStyle = "bg-pitch-light border-pitch-light/80 text-gray-300";
                    if (b === "W") pillStyle = "bg-wicket-pink border-wicket-pink/50 text-white font-extrabold shadow-[0_0_10px_rgba(244,63,94,0.4)]";
                    else if (b === "6") pillStyle = "bg-stadium-neon border-stadium-neon/50 text-pitch-dark font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.4)]";
                    else if (b === "4") pillStyle = "bg-neon-gold border-neon-gold/50 text-pitch-dark font-extrabold shadow-[0_0_10px_rgba(251,191,36,0.4)]";
                    else if (b === "0") pillStyle = "bg-pitch-dark border-pitch-light/30 text-gray-500";
                    
                    return (
                      <span 
                        key={idx} 
                        className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-transform hover:scale-110 ${pillStyle}`}
                      >
                        {b}
                      </span>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* LIVE COMMENTARY / AI INSIGHT CARD */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg border border-pitch-light relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-stadium-neon/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between pb-3.5 border-b border-pitch-light/35 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stadium-neon/15 flex items-center justify-center border border-stadium-neon/30">
                    <Sparkles className="w-4.5 h-4.5 text-stadium-neon ball-float" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">AI Host Live Commentary</h3>
                    <p className="text-[10px] text-gray-400">Powered by Google Gemini Agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-stadium-neon bg-stadium-neon/10 px-2.5 py-0.5 rounded border border-stadium-neon/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-stadium-neon pulse-indicator" />
                  <span>Real-Time Commentary</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-pitch-medium/35 border border-pitch-light/45 leading-relaxed relative min-h-[90px] shadow-inner">
                <div className="flex-1">
                  <p className="text-sm text-gray-100 font-medium italic">
                    "{match.commentary}"
                  </p>
                </div>
              </div>

              {/* Dimissed player Profile/Stat Card (Wicket Event) */}
              {match.dismissed_player_stat && (
                <div className="mt-4 p-4 rounded-xl bg-wicket-pink/10 border border-wicket-pink/35 shadow-[0_0_20px_rgba(244,63,94,0.06)] animate-pulse">
                  <div className="flex items-center gap-2 text-wicket-pink text-xs font-bold uppercase tracking-wider mb-1.5">
                    <Award className="w-4 h-4" /> Dismissed Player Profile & Insight
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {match.dismissed_player_stat}
                  </p>
                </div>
              )}
            </div>

            {/* WIN PROBABILITY WITH AI EXPLANATION */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg border border-pitch-light relative overflow-hidden">
              
              <div className="flex items-center gap-2.5 pb-3 border-b border-pitch-light/35 mb-4">
                <Shield className="w-5 h-5 text-neon-gold" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Live Win Probability Analyzer</h3>
              </div>

              {/* Progress Slider Display */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-stadium-neon" />
                    {match.team_a} ({match.win_probability_a}%)
                  </span>
                  <span className="text-gray-300 flex items-center gap-1.5">
                    {match.team_b} ({match.win_probability_b}%)
                    <span className="w-2.5 h-2.5 rounded bg-wicket-pink" />
                  </span>
                </div>

                {/* High-Fidelity Prob Bar */}
                <div className="h-4 w-full rounded-full bg-wicket-pink overflow-hidden flex shadow-inner border border-pitch-light">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-stadium-neon transition-all duration-1000 shadow-inner"
                    style={{ width: `${match.win_probability_a}%` }}
                  />
                </div>
                
                {/* AI Explanation Paragraph */}
                <div className="mt-2 p-3.5 bg-pitch-dark/45 rounded-xl border border-pitch-light/50 flex flex-col gap-1.5 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-neon-gold tracking-widest">Tactical Shift Breakdown</div>
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    {match.win_probability_explanation}
                  </p>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Fan Engagement Arena & Simulator */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* FAN INTERACTION: DYNAMIC POLL CARD */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg border border-pitch-light relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-neon-gold/5 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between pb-3.5 border-b border-pitch-light/35 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neon-gold/15 flex items-center justify-center border border-neon-gold/30">
                    <Flame className="w-4.5 h-4.5 text-neon-gold animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">Fan Engagement Arena</h3>
                    <p className="text-[10px] text-gray-400">Live predictions and predictions</p>
                  </div>
                </div>
                {match.active_poll && (
                  <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded bg-wicket-pink/15 text-wicket-pink border border-wicket-pink/30 animate-pulse">
                    Active Poll
                  </span>
                )}
              </div>

              {match.active_poll ? (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-pitch-medium/40 border border-pitch-light/50 rounded-xl shadow-inner">
                    <span className="text-[9px] uppercase font-extrabold tracking-widest text-neon-gold block mb-1">Gemini Asks You:</span>
                    <h4 className="text-sm font-bold text-white leading-relaxed">
                      {match.active_poll.question}
                    </h4>
                  </div>

                  <div className="flex flex-col gap-2">
                    {match.active_poll.options.map((opt, idx) => {
                      const isSelected = votedOption === idx;
                      return (
                        <button
                          key={idx}
                          disabled={hasVoted}
                          onClick={() => sendPrediction(username, idx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                            isSelected 
                              ? "bg-gradient-to-r from-stadium-neon/15 to-pitch-light border-stadium-neon text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]" 
                              : "bg-pitch-dark/45 border-pitch-light/60 text-gray-300 hover:text-white hover:bg-pitch-medium hover:border-stadium-neon/35"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-stadium-neon" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {hasVoted && (
                    <div className="p-3.5 bg-stadium-neon/10 border border-stadium-neon/35 text-xs text-white rounded-xl font-medium leading-relaxed flex items-start gap-2 animate-fadeIn shadow-[0_0_12px_rgba(16,185,129,0.06)]">
                      <Sparkles className="w-4.5 h-4.5 text-neon-gold shrink-0 mt-0.5" />
                      <div>
                        {votingFeedback || "Prediction registered! You have been awarded +10 participation points. Let's see what the bowler does!"}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-3 bg-pitch-medium/20 rounded-xl border border-pitch-light/35 shadow-inner">
                  <div className="w-11 h-11 rounded-full bg-pitch-light/65 flex items-center justify-center border border-pitch-light">
                    <HelpCircle className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Awaiting AI Event Decision</h4>
                    <p className="text-[11px] text-gray-400 max-w-[280px] mt-1 leading-normal">
                      The AI agent triggers dynamic polls and prediction quizzes during high-impact events like **Wickets**, **Sixes**, or **Chase overs**.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* LIVE FAN LEADERBOARD */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg border border-pitch-light relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stadium-neon/5 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between pb-3.5 border-b border-pitch-light/35 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stadium-neon/15 flex items-center justify-center border border-stadium-neon/30">
                    <Trophy className="w-4.5 h-4.5 text-stadium-neon" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">Fan Leaderboard</h3>
                    <p className="text-[10px] text-gray-400">Updated automatically on prediction results</p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-gray-300 px-2 py-0.5 rounded bg-pitch-light">
                  Rank #{userStats.rank || "--"}
                </div>
              </div>

              {/* Leaderboard Players list */}
              <div className="flex flex-col gap-2">
                {match.leaderboard.map((user, idx) => {
                  const isYou = user.username.toLowerCase() === username.toLowerCase();
                  let rankColor = "text-gray-400";
                  if (user.rank === 1) rankColor = "text-neon-gold font-extrabold";
                  else if (user.rank === 2) rankColor = "text-gray-300 font-extrabold";
                  else if (user.rank === 3) rankColor = "text-amber-600 font-extrabold";

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isYou 
                          ? "bg-stadium-neon/10 border-stadium-neon/45 shadow-[0_0_15px_rgba(16,185,129,0.08)]" 
                          : "bg-pitch-dark/30 border-pitch-light/35"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-xs text-center font-bold font-mono ${rankColor}`}>
                          #{user.rank}
                        </span>
                        <div>
                          <span className={`text-xs font-bold ${isYou ? "text-stadium-neon" : "text-white"}`}>
                            {user.username} {isYou && <span className="text-[9px] font-semibold text-gray-400">(You)</span>}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-white">
                        {user.points} pts
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* LIVE CONTROL PANEL: EVENT INJECTOR (CRITICAL FOR DEMO!) */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg border border-pitch-light relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-stadium-neon/5 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between pb-3.5 border-b border-pitch-light/35 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stadium-neon/15 flex items-center justify-center border border-stadium-neon/30">
                    <Play className="w-4.5 h-4.5 text-stadium-neon" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display">Live Event Injector</h3>
                    <p className="text-[10px] text-gray-400">Trigger match events manually during demo</p>
                  </div>
                </div>
              </div>

              {/* Event Injector Grid */}
              <div className="flex flex-col gap-4">
                
                {/* Row 1: Quick Single Events */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => simulateEvent("dot")}
                    className="p-2.5 rounded-lg bg-pitch-dark hover:bg-pitch-light border border-pitch-light hover:border-gray-500 text-[11px] font-bold text-gray-300 transition hover:scale-[1.02]"
                  >
                    Dot Ball
                  </button>
                  <button 
                    onClick={() => simulateEvent("single")}
                    className="p-2.5 rounded-lg bg-pitch-dark hover:bg-pitch-light border border-pitch-light hover:border-stadium-neon/45 text-[11px] font-bold text-gray-300 transition hover:scale-[1.02]"
                  >
                    Single Run
                  </button>
                  <button 
                    onClick={() => simulateEvent("double")}
                    className="p-2.5 rounded-lg bg-pitch-dark hover:bg-pitch-light border border-pitch-light hover:border-stadium-neon/45 text-[11px] font-bold text-gray-300 transition hover:scale-[1.02]"
                  >
                    Double Run
                  </button>
                </div>

                {/* Row 2: Crucial/High-Impact Events */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => simulateEvent("four")}
                    className="p-2.5 rounded-lg bg-pitch-medium hover:bg-pitch-light border border-neon-gold/30 hover:border-neon-gold text-[11px] font-bold text-neon-gold transition hover:scale-[1.02]"
                  >
                    💥 Four!
                  </button>
                  <button 
                    onClick={() => simulateEvent("six")}
                    className="p-2.5 rounded-lg bg-pitch-medium hover:bg-pitch-light border border-stadium-neon/30 hover:border-stadium-neon text-[11px] font-bold text-stadium-neon transition hover:scale-[1.02]"
                  >
                    🚀 Six!
                  </button>
                  <button 
                    onClick={() => simulateEvent("wicket")}
                    className="p-2.5 rounded-lg bg-pitch-medium hover:bg-pitch-light border border-wicket-pink/30 hover:border-wicket-pink text-[11px] font-bold text-wicket-pink transition hover:scale-[1.02]"
                  >
                    🔴 Wicket!
                  </button>
                </div>

                {/* Row 3: Admin Global Events */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-pitch-light/35">
                  <button 
                    onClick={() => simulateEvent("chase_mode")}
                    className="p-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 text-white font-bold text-[11px] uppercase tracking-wider transition hover:scale-[1.02] shadow"
                  >
                    🔥 Chase Mode
                  </button>
                  <button 
                    onClick={() => simulateEvent("toggle_auto")}
                    className={`p-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition hover:scale-[1.02] flex items-center justify-center gap-1.5 border shadow ${
                      match.auto_simulate 
                        ? "bg-stadium-neon/15 border-stadium-neon text-stadium-neon" 
                        : "bg-pitch-dark border-pitch-light text-gray-300"
                    }`}
                  >
                    {match.auto_simulate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Auto-Simulate</span>
                  </button>
                </div>

                {/* Row 4: Reset Button */}
                <button 
                  onClick={() => simulateEvent("reset")}
                  className="w-full p-2.5 rounded-lg bg-pitch-dark hover:bg-pitch-medium border border-pitch-light/60 hover:border-gray-400 text-[11px] font-bold text-gray-400 hover:text-white uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Simulation to 14.0 Overs</span>
                </button>

                {lastEventMessage && (
                  <div className="text-center text-[10px] font-bold text-neon-gold tracking-wide animate-pulse">
                    {lastEventMessage}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-pitch-light/50 bg-pitch-dark/80 text-center relative z-10 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Google Cloud Hackathon. Built with Gemini AI & FastAPI.</p>
          <div className="flex gap-4">
            <span className="text-[10px] px-2 py-0.5 rounded bg-pitch-light border border-pitch-light text-gray-400 font-mono">FastAPI API: :8000</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-pitch-light border border-pitch-light text-gray-400 font-mono">React App: :5173</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
