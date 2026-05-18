import React, { useState, useEffect, useRef } from "react";
import { 
  Tv, Shield, Zap, Award, Flame, Send, Settings, User, 
  Play, Pause, RefreshCw, AlertCircle, Sparkles, Check, 
  HelpCircle, Eye, EyeOff, Trophy, Volume2, VolumeX,
  Activity, Radio, ChevronRight, Terminal, Cpu, MessageSquare, Info
} from "lucide-react";

export default function App() {
  // Connection and Lobby Configuration state
  const [joined, setJoined] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState(() => localStorage.getItem("apl_username") || "");
  
  // Dynamic settings configuration keys
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [cricKey, setCricKey] = useState(() => localStorage.getItem("cric_api_key") || "");
  const [showConfig, setShowConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Match State from server
  const [match, setMatch] = useState({
    room_code: "",
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
    commentary: "Welcome to the second-screen experience of The 12th Man!",
    active_poll: null,
    chase_mode: false,
    match_active: true,
    dismissed_player_stat: "",
    leaderboard: []
  });

  // Client interactive States
  const [wsConnected, setWsConnected] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votingFeedback, setVotingFeedback] = useState("");
  const [lastEventMessage, setLastEventMessage] = useState("");
  const [recentNotification, setRecentNotification] = useState("");
  const [socketAttempts, setSocketAttempts] = useState(0);
  const [showDemoConsole, setShowDemoConsole] = useState(false);

  const socketRef = useRef(null);

  // Web Audio API Synthesizer (Zero-file sound engine for live matches)
  const playSoundEffect = (type) => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "six") {
        // High energetic laser beam sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "wicket") {
        // Dramatic low buzz drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "win") {
        // Glorious arpeggio chords
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
          
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
        });
      } else if (type === "beep") {
        // Soft room entry beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch(e) {
      console.log("Audio API not supported in this frame:", e);
    }
  };

  // Helper to trigger floating visual notifications
  const triggerNotification = (msg) => {
    setRecentNotification(msg);
    setTimeout(() => {
      setRecentNotification("");
    }, 4500);
  };

  // WebSocket Connection Handler
  const connectWebSocket = (targetRoom) => {
    try {
      if (socketRef.current) {
        socketRef.current.close();
      }

      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//127.0.0.1:8000/ws/${targetRoom}`;
      
      console.log("Connecting to WebSockets Broker:", wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        setSocketAttempts(0);
        playSoundEffect("beep");
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        console.log("Realtime Feed Payload:", payload);
        
        if (payload.type === "INIT_STATE" || payload.type === "STATE_UPDATE") {
          const oldState = match;
          const newState = payload.data;
          
          setMatch(newState);

          // React to match events
          if (newState.runs > oldState.runs && (newState.runs - oldState.runs) === 6) {
            triggerNotification("💥 SIX HIT! AI Agent updated commentary!");
            playSoundEffect("six");
          } else if (newState.wickets > oldState.wickets) {
            triggerNotification("🔴 WICKET! Check dismissed player stats.");
            playSoundEffect("wicket");
          } else if (newState.chase_mode && !oldState.chase_mode) {
            triggerNotification("🔥 DEATH OVER MODE! Live win probability live!");
            playSoundEffect("beep");
          } else if (!newState.match_active && oldState.match_active) {
            triggerNotification("🏆 MATCH ENDED! India Wins!");
            playSoundEffect("win");
          }

          // Reset voting if new poll gets triggered
          if (
            newState.active_poll && 
            (!oldState.active_poll || oldState.active_poll.question !== newState.active_poll.question)
          ) {
            setHasVoted(false);
            setVotedOption(null);
            setVotingFeedback("");
            playSoundEffect("beep");
            triggerNotification("⚡ AI Agent triggered new live prediction poll!");
          }
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (socketAttempts < 10 && joined) {
          setTimeout(() => {
            setSocketAttempts(prev => prev + 1);
            connectWebSocket(targetRoom);
          }, 3000);
        }
      };

      socket.onerror = () => {
        setWsConnected(false);
      };

    } catch (e) {
      console.log(e);
      setWsConnected(false);
    }
  };

  // HTTP Polling Fallback if socket drops
  useEffect(() => {
    if (!joined || !roomCode) return;
    
    connectWebSocket(roomCode);

    const interval = setInterval(() => {
      if (!wsConnected && joined) {
        fetch(`http://127.0.0.1:8000/api/get-match-state?room_code=${roomCode}`)
          .then(res => res.json())
          .then(data => {
            setMatch(data);
          })
          .catch(err => console.log("Fallback poll error", err));
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.close();
    };
  }, [joined, roomCode, wsConnected]);

  // Create Room Lobby handler
  const handleCreateRoom = async () => {
    if (!username.trim()) {
      triggerNotification("⚠️ Please enter your name first!");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:8000/api/create-room", { method: "POST" });
      const data = await response.json();
      if (data.status === "success") {
        const code = data.room_code;
        setRoomCode(code);
        
        // Join immediately
        await fetch("http://127.0.0.1:8000/api/join-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_code: code, username: username.trim() })
        });
        
        localStorage.setItem("apl_username", username.trim());
        setJoined(true);
        triggerNotification(`🏆 Room ${code} created successfully!`);
      }
    } catch(e) {
      triggerNotification("⚠️ Failed to create match room.");
    }
  };

  // Join Room Lobby handler
  const handleJoinRoom = async () => {
    if (!username.trim()) {
      triggerNotification("⚠️ Please enter your name!");
      return;
    }
    if (!roomCodeInput.trim()) {
      triggerNotification("⚠️ Please enter a 4-digit room code!");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:8000/api/join-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_code: roomCodeInput.trim(), username: username.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setRoomCode(roomCodeInput.trim());
        setMatch(data.data);
        localStorage.setItem("apl_username", username.trim());
        setJoined(true);
        triggerNotification("🏏 Joined Match Lobby!");
      } else {
        triggerNotification("⚠️ Room code not found.");
      }
    } catch(e) {
      triggerNotification("⚠️ Failed to join room.");
    }
  };

  // Submit dynamic credentials
  const handleSaveConfig = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/config-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_key: geminiKey, cric_key: cricKey })
      });
      if (response.ok) {
        localStorage.setItem("gemini_api_key", geminiKey);
        localStorage.setItem("cric_api_key", cricKey);
        setConfigStatus("✅ Keys fully updated!");
        triggerNotification("MatchAgent live parameters synchronized!");
        setTimeout(() => setConfigStatus(""), 3500);
      }
    } catch(e) {
      setConfigStatus("❌ Configuration synchronization failed.");
    }
  };

  // Submit Fan Prediction Choice
  const handleVote = async (optionIdx) => {
    if (hasVoted) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/api/submit-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_code: roomCode,
          username: username,
          option_index: optionIdx
        })
      });
      if (response.ok) {
        setHasVoted(true);
        setVotedOption(optionIdx);
        setVotingFeedback("Prediction locked! Earn +100 points if correct!");
        triggerNotification("🌟 Prediction logged! Wait for the next delivery.");
      } else {
        const err = await response.json();
        triggerNotification("⚠️ " + err.detail);
      }
    } catch(e) {
      triggerNotification("⚠️ Failed to submit prediction choice.");
    }
  };

  // Run Manual Match Event Simulation (Demo Console)
  const handleSimulate = async (eventName) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/simulate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_code: roomCode, event: eventName })
      });
      const data = await response.json();
      if (response.ok) {
        setLastEventMessage(`Simulated: ${eventName}`);
        setTimeout(() => setLastEventMessage(""), 3500);
      }
    } catch(e) {
      triggerNotification("⚠️ Simulation triggers offline.");
    }
  };

  // Score metrics
  const runsNeeded = Math.max(0, match.target - match.runs);
  const ballsRemaining = Math.max(0, 120 - Math.floor(match.overs * 6) - (Math.floor((match.overs % 1) * 10)));
  const currentRR = match.overs > 0 ? (match.runs / match.overs).toFixed(2) : "0.00";
  const requiredRR = ballsRemaining > 0 ? ((runsNeeded / (ballsRemaining / 6))).toFixed(2) : "0.00";
  const striker = match.batters.find(b => b.is_striker) || match.batters[0];
  const nonStriker = match.batters.find(b => !b.is_striker) || match.batters[1];
  const userStats = match.leaderboard.find(u => u.username.toLowerCase() === username.toLowerCase()) || { points: 0, rank: "--" };

  // --- RENDERING LOBBY SCREEN (Lobby Screen / Room Join) ---
  if (!joined) {
    return (
      <div className="min-h-screen bg-grid-pattern relative flex flex-col justify-between py-12 px-4">
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-stadium-neon/10 to-transparent pointer-events-none z-0" />
        
        {/* Visual floating alert */}
        {recentNotification && (
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 glass-panel border border-stadium-neon px-5 py-3 rounded-full flex items-center gap-3 animate-bounce shadow-md">
            <Sparkles className="w-5 h-5 text-neon-gold" />
            <span className="text-white font-medium text-sm">{recentNotification}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center items-center relative z-10 max-w-md mx-auto w-full">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stadium-neon to-emerald-600 flex items-center justify-center border border-stadium-neon/40 shadow-lg glow-stadium mb-4 ball-float">
              <Tv className="w-8.5 h-8.5 text-white" />
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-stadium-neon/15 text-stadium-neon border border-stadium-neon/30 uppercase tracking-widest mb-2 font-display">
              Google Cloud Hackathon
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">
              The <span className="text-stadium-neon">12th Man</span>
            </h1>
            <p className="text-gray-400 text-xs mt-2 max-w-sm font-medium">
              A live autonomous AI sidekick running on your phone, transforming passive viewers into active room participants!
            </p>
          </div>

          {/* Lobby Box Cards */}
          <div className="w-full glass-panel glass-panel-glow rounded-2xl p-6 flex flex-col gap-5 border border-pitch-light/80 shadow-2xl relative">
            
            {/* Input Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Your Fan Name</label>
              <div className="relative flex items-center bg-pitch-dark border border-pitch-light rounded-xl overflow-hidden focus-within:border-stadium-neon/50 transition-all shadow-inner">
                <div className="pl-3.5 pr-2.5 text-stadium-neon">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  placeholder="Enter username (e.g. King Kohli)..." 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent text-white px-1 py-3 text-sm outline-none font-semibold"
                />
              </div>
            </div>

            {/* Split Options */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Join Room Lobby</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="4-digit code (e.g. 4080)" 
                  value={roomCodeInput} 
                  maxLength={4}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  className="w-1/2 bg-pitch-dark border border-pitch-light rounded-xl text-white text-center text-sm font-mono outline-none focus:border-stadium-neon/50 transition-all font-bold shadow-inner"
                />
                <button 
                  onClick={handleJoinRoom}
                  className="w-1/2 py-3 rounded-xl bg-pitch-medium hover:bg-pitch-light text-white text-xs font-bold border border-pitch-light hover:border-stadium-neon/40 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <ChevronRight className="w-4.5 h-4.5 text-stadium-neon" />
                  <span>Join Room</span>
                </button>
              </div>
              
              <div className="relative flex items-center justify-center my-1.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-pitch-light/35"></div>
                </div>
                <span className="relative px-3 bg-pitch-medium rounded-full text-[10px] text-gray-500 font-bold uppercase tracking-widest">or</span>
              </div>

              <button 
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-stadium-neon to-emerald-600 hover:to-stadium-neon text-pitch-dark font-extrabold text-xs uppercase tracking-widest transition-all hover:scale-[1.01] shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Trophy className="w-4.5 h-4.5" />
                <span>Create Friend Room</span>
              </button>
            </div>
            
          </div>
        </div>

        {/* Brand Footer */}
        <div className="text-center relative z-10 text-[10px] text-gray-500 font-semibold tracking-wider flex items-center justify-center gap-1">
          <span>POWERED BY</span>
          <Cpu className="w-3.5 h-3.5 text-stadium-neon" />
          <span className="text-stadium-neon">GOOGLE GEMINI 1.5 FLASH</span>
        </div>
      </div>
    );
  }

  // --- RENDERING LIVE MATCH CENTER (Joined Live View) ---
  return (
    <div className="min-h-screen bg-grid-pattern relative pb-12">
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-stadium-neon/10 to-transparent pointer-events-none z-0" />

      {/* Floating Notification */}
      {recentNotification && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 glass-panel border border-stadium-neon px-5 py-3 rounded-full flex items-center gap-3 animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.35)]">
          <Sparkles className="w-5 h-5 text-neon-gold animate-pulse" />
          <span className="text-white font-medium text-sm tracking-wide">{recentNotification}</span>
        </div>
      )}

      {/* Main Header */}
      <header className="border-b border-pitch-light/50 sticky top-0 bg-pitch-dark/85 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stadium-neon to-emerald-600 flex items-center justify-center border border-stadium-neon/40 shadow-inner">
              <Tv className="w-5.5 h-5.5 text-white ball-float" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stadium-neon/15 text-stadium-neon border border-stadium-neon/30 tracking-widest font-display">12TH MAN</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neon-gold text-pitch-dark uppercase">Lobby: {roomCode}</span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none mt-1">Build with AI – <span className="text-stadium-neon">Agentic Premier League</span></h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio switch */}
            <button 
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-2 rounded-lg bg-pitch-medium text-gray-400 hover:text-white border border-pitch-light text-xs transition"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-stadium-neon" /> : <VolumeX className="w-4 h-4 text-wicket-pink" />}
            </button>

            {/* Sync connection status pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pitch-medium border border-pitch-light text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-stadium-neon pulse-indicator" : "bg-wicket-pink animate-pulse"}`} />
              <span className="text-gray-300 text-[10px] uppercase tracking-wide">{wsConnected ? "Realtime Broker Sync" : "Poller Sync"}</span>
            </div>

            {/* Profile points capsule */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-medium border border-pitch-light/60 text-xs font-bold text-gray-200">
              <User className="w-3.5 h-3.5 text-stadium-neon" />
              <span>{username}</span>
              <span className="text-[10px] text-neon-gold bg-neon-gold/15 px-1.5 py-0.5 rounded border border-neon-gold/20 font-bold ml-1">{userStats.points} pts</span>
            </div>

            {/* Settings Parameter Button */}
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg border transition-all ${showConfig ? "bg-stadium-neon text-pitch-dark border-stadium-neon" : "bg-pitch-medium text-gray-400 hover:text-white border-pitch-light hover:border-stadium-neon/45"}`}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Credentials Parameter Config Overlay */}
      {showConfig && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 relative z-40">
          <div className="glass-panel border-stadium-neon/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-stadium-neon/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-neon-gold" />
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display">Configure Live Match Agent Parameters</h3>
                </div>
                <button 
                  onClick={() => setShowConfig(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded bg-pitch-light hover:bg-pitch-medium border border-pitch-light"
                >
                  Close Panel
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl font-medium">
                Sync your Google Gemini API Key and CricAPI Credential into the active Match Agent. If CricAPI Key is empty, the server automatically transitions into highly realistic **Live Score Simulation Mode** so the hackathon demo remains 100% stable without keys!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Google Gemini API Key</label>
                  <input 
                    type="password"
                    placeholder="Enter GEMINI_API_KEY..." 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="w-full bg-pitch-dark text-white px-3 py-2 text-xs font-mono outline-none border border-pitch-light rounded-lg focus:border-stadium-neon/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CricAPI.com Key</label>
                  <input 
                    type="password"
                    placeholder="Enter CRICAPI_KEY..." 
                    value={cricKey}
                    onChange={(e) => setCricKey(e.target.value)}
                    className="w-full bg-pitch-dark text-white px-3 py-2 text-xs font-mono outline-none border border-pitch-light rounded-lg focus:border-stadium-neon/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <button 
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-stadium-neon to-emerald-600 hover:to-stadium-neon text-pitch-dark font-extrabold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] shadow-md cursor-pointer"
                >
                  Apply Live Keys
                </button>
                {configStatus && (
                  <span className="text-xs font-bold text-neon-gold animate-pulse">{configStatus}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Live Score & MatchAgent Insight Commentator */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* SCOREBOARD COMPONENT */}
            <div className={`glass-panel rounded-2xl overflow-hidden glass-panel-glow border-t-2 relative transition-all duration-500 ${match.chase_mode ? "border-t-wicket-pink shadow-[0_0_35px_rgba(244,63,94,0.15)]" : "border-t-stadium-neon shadow-lg"}`}>
              <div className="px-5 py-3.5 bg-pitch-medium/60 border-b border-pitch-light/35 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${match.match_active ? "bg-stadium-neon pulse-indicator" : "bg-wicket-pink animate-pulse"}`} />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-stadium-neon font-display">Live Match Feed</span>
                </div>
                {match.chase_mode && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-wicket-pink/20 text-wicket-pink border border-wicket-pink/35 rounded uppercase tracking-widest animate-pulse font-display">
                    🚨 Death Overs Active
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col gap-5">
                {/* Score and Overs split */}
                <div className="flex justify-between items-center border-b border-pitch-light/35 pb-5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{match.team_a} Chasing</span>
                    <h2 className="text-4xl font-extrabold text-white leading-none mt-1.5 tracking-tight neon-score">
                      {match.runs}<span className="text-gray-400 text-3xl">/{match.wickets}</span>
                    </h2>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-extrabold text-stadium-neon uppercase bg-stadium-neon/10 border border-stadium-neon/20 px-2.5 py-0.5 rounded-full tracking-wider leading-none">Overs {match.overs}</span>
                    <div className="text-2xl font-bold text-white tracking-tight mt-1.5 font-display leading-none">
                      {runsNeeded} <span className="text-xs text-gray-400">runs needed off</span> {ballsRemaining} <span className="text-xs text-gray-400">balls</span>
                    </div>
                  </div>
                </div>

                {/* Batter / Bowler stats details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-gray-200">
                  <div className="bg-pitch-dark/50 border border-pitch-light/40 rounded-xl p-3.5 shadow-inner">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Batters Crease</span>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className={`flex items-center gap-1.5 ${striker.is_striker ? "text-stadium-neon font-bold" : "text-gray-300"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-stadium-neon inline-block" />
                          {striker.name}
                        </span>
                        <span className="font-bold">{striker.runs} <span className="text-gray-400 font-medium">({striker.balls})</span></span>
                      </div>
                      <div className="flex justify-between items-center border-t border-pitch-light/20 pt-2.5">
                        <span className={`flex items-center gap-1.5 ${nonStriker.is_striker ? "text-stadium-neon font-bold" : "text-gray-300"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />
                          {nonStriker.name}
                        </span>
                        <span className="font-bold">{nonStriker.runs} <span className="text-gray-400 font-medium">({nonStriker.balls})</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pitch-dark/50 border border-pitch-light/40 rounded-xl p-3.5 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Active Bowler</span>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-bold">{match.bowler.name}</span>
                        <span className="font-bold">{match.bowler.wickets} <span className="text-gray-400 font-medium">/ {match.bowler.runs}</span> <span className="text-[10px] text-gray-500">({match.bowler.overs})</span></span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-pitch-light/20 pt-2.5 text-[10px] font-semibold text-gray-400 mt-2.5 uppercase tracking-wide">
                      <span>CRR: <strong className="text-white">{currentRR}</strong></span>
                      <span>RRR: <strong className="text-wicket-pink">{requiredRR}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Over Deliveries Tracker */}
                <div className="flex items-center gap-2 bg-pitch-dark/55 border border-pitch-light/35 rounded-xl px-4 py-2.5 mt-1 shadow-inner">
                  <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest shrink-0 mr-1.5">This Over</span>
                  <div className="flex flex-wrap gap-2">
                    {match.last_balls.map((b, idx) => {
                      let badge = "bg-pitch-light border border-pitch-light text-gray-300";
                      if (b === "6") badge = "bg-neon-gold/25 border border-neon-gold text-neon-gold font-bold scale-105";
                      else if (b === "4") badge = "bg-stadium-neon/20 border border-stadium-neon text-stadium-neon font-bold";
                      else if (b === "W") badge = "bg-wicket-pink/25 border border-wicket-pink text-wicket-pink font-bold animate-pulse";
                      return (
                        <span key={idx} className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm ${badge}`}>
                          {b}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* THE 12TH MAN MATCHAGENT INSIGHT COMMENTARY CARD */}
            <div className="glass-panel rounded-2xl p-5 relative overflow-hidden border border-pitch-light/80 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-stadium-neon/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 pb-3 border-b border-pitch-light/35 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-stadium-neon to-emerald-600 flex items-center justify-center border border-stadium-neon/20 shadow-sm relative shrink-0">
                  <Cpu className="w-4 h-4 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-stadium-neon rounded-full border border-pitch-dark animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-display">Match Agent Autonomous Insight</h3>
                  <span className="text-[9px] font-semibold text-stadium-neon tracking-wider">Gemini 1.5 Flash • Live show sidekick</span>
                </div>
              </div>

              {/* Speech bubble dialogue */}
              <div className="p-4 rounded-xl bg-pitch-dark/50 border border-pitch-light/45 text-xs text-gray-200 leading-relaxed font-semibold shadow-inner italic">
                "{match.commentary}"
              </div>

              {/* Dynamic Win probability */}
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                  <span className="text-stadium-neon">{match.team_a} win: {match.win_probability_a}%</span>
                  <span className="text-wicket-pink">{match.team_b} win: {match.win_probability_b}%</span>
                </div>
                <div className="w-full h-2.5 bg-pitch-dark rounded-full overflow-hidden flex border border-pitch-light/50 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-stadium-neon to-emerald-500 transition-all duration-700" style={{ width: `${match.win_probability_a}%` }} />
                  <div className="h-full bg-gradient-to-r from-wicket-pink to-rose-600 transition-all duration-700" style={{ width: `${match.win_probability_b}%` }} />
                </div>
                {match.win_probability_explanation && (
                  <p className="text-[10px] font-semibold text-gray-400 leading-relaxed mt-1">
                    💡 <strong className="text-white">Agent Logic:</strong> {match.win_probability_explanation}
                  </p>
                )}
              </div>

              {/* Wicket player stat card popup */}
              {match.dismissed_player_stat && (
                <div className="mt-4 p-4 rounded-xl bg-wicket-pink/5 border border-wicket-pink/25 shadow-inner">
                  <div className="flex items-center gap-1.5 text-wicket-pink text-[10px] font-extrabold uppercase tracking-widest mb-1">
                    <Award className="w-4 h-4" /> Dismissed Player Profile Tool
                  </div>
                  <p className="text-[11px] text-gray-300 leading-normal font-semibold italic">
                    {match.dismissed_player_stat}
                  </p>
                </div>
              )}
            </div>
            
          </div>

          {/* RIGHT: Fan Prediction Poll & Live Leaderboard */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* ACTIVE PREDICTION POLL CARD */}
            <div className="glass-panel rounded-2xl overflow-hidden glass-panel-glow border-t-2 border-t-neon-gold shadow-lg">
              <div className="px-5 py-3.5 bg-pitch-medium/60 border-b border-pitch-light/35 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4.5 h-4.5 text-neon-gold animate-bounce" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neon-gold font-display">Autonomous Prediction Challange</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-neon-gold/15 text-neon-gold border border-neon-gold/25 tracking-wider uppercase">
                  +100 pts
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {match.active_poll ? (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-white leading-relaxed tracking-wide">
                      ❓ {match.active_poll.question}
                    </h3>
                    
                    <div className="flex flex-col gap-2.5">
                      {match.active_poll.options.map((opt, idx) => {
                        const isSelected = votedOption === idx;
                        let btnStyle = "bg-pitch-dark/60 hover:bg-pitch-light border-pitch-light text-gray-300";
                        if (hasVoted) {
                          if (isSelected) {
                            btnStyle = "bg-stadium-neon/15 border-stadium-neon text-stadium-neon font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                          } else {
                            btnStyle = "bg-pitch-dark/30 border-pitch-light/20 text-gray-500 cursor-not-allowed opacity-60";
                          }
                        }
                        
                        return (
                          <button
                            key={idx}
                            disabled={hasVoted}
                            onClick={() => handleVote(idx)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.01] flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-stadium-neon shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {votingFeedback && (
                      <div className="text-center text-[10px] font-bold text-stadium-neon bg-stadium-neon/10 border border-stadium-neon/20 py-2 rounded-lg animate-pulse uppercase tracking-wider">
                        🌟 {votingFeedback}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8 gap-3">
                    <div className="w-12 h-12 rounded-full bg-pitch-dark/80 flex items-center justify-center border border-pitch-light/40">
                      <HelpCircle className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Awaiting Next Ball Event</span>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[220px] mx-auto font-medium">
                        The MatchAgent automatically triggers prediction questions on boundaries, wickets, and crucial death overs. Keep your eyes locked here!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ROOM FRIEND LEADERBOARD */}
            <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-pitch-light/80">
              <div className="px-5 py-3.5 bg-pitch-medium/60 border-b border-pitch-light/35 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4.5 h-4.5 text-neon-gold" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white font-display">Friend Leaderboard</span>
                </div>
                <span className="text-[9px] font-bold text-stadium-neon bg-stadium-neon/10 px-2 py-0.5 rounded border border-stadium-neon/20 tracking-wider">
                  Live Sync
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2.5">
                {match.leaderboard.map((player, idx) => {
                  const isSelf = player.username.toLowerCase() === username.toLowerCase();
                  
                  let rankStyle = "bg-pitch-dark border border-pitch-light text-gray-400";
                  if (player.rank === 1) rankStyle = "bg-neon-gold text-pitch-dark border-neon-gold font-extrabold";
                  else if (player.rank === 2) rankStyle = "bg-gray-300 text-pitch-dark border-gray-300 font-bold";
                  else if (player.rank === 3) rankStyle = "bg-amber-600 text-white border-amber-600 font-bold";
                  
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        isSelf 
                          ? "bg-stadium-neon/10 border-stadium-neon/40 shadow-inner" 
                          : "bg-pitch-dark/30 border-pitch-light/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm ${rankStyle}`}>
                          {player.rank}
                        </span>
                        <span className={`tracking-wide ${isSelf ? "text-stadium-neon font-bold" : "text-gray-200"}`}>
                          {player.username} {isSelf && "(You)"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-neon-gold tracking-wide">
                        {player.points} <span className="text-[9px] text-gray-500 font-medium">pts</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* --- HIDDEN DEMO sim CONTROLLER DRAG-BUTTON --- */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5">
        {showDemoConsole && (
          <div className="glass-panel border-stadium-neon rounded-2xl p-4.5 shadow-2xl flex flex-col gap-3 max-w-[280px] w-[260px] animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-pitch-light/35">
              <span className="text-[10px] font-extrabold text-neon-gold uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-neon-gold" />
                Demo Controller
              </span>
              <button 
                onClick={() => setShowDemoConsole(false)}
                className="text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-wider"
              >
                Hide
              </button>
            </div>
            
            <p className="text-[10px] text-gray-400 leading-normal font-medium">
              Manually fire match events during the presentation to showcase the autonomous tool call pipeline!
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
              <button 
                onClick={() => handleSimulate("six")}
                className="py-2.5 rounded-lg bg-neon-gold/15 hover:bg-neon-gold/25 border border-neon-gold/30 text-neon-gold text-center cursor-pointer transition active:scale-95"
              >
                💥 Hit Six
              </button>
              <button 
                onClick={() => handleSimulate("wicket")}
                className="py-2.5 rounded-lg bg-wicket-pink/15 hover:bg-wicket-pink/25 border border-wicket-pink/30 text-wicket-pink text-center cursor-pointer transition active:scale-95"
              >
                🔴 Wicket
              </button>
              <button 
                onClick={() => handleSimulate("death_overs")}
                className="py-2.5 rounded-lg bg-stadium-neon/15 hover:bg-stadium-neon/25 border border-stadium-neon/30 text-stadium-neon text-center cursor-pointer transition active:scale-95"
              >
                ⚡ Death Over
              </button>
              <button 
                onClick={() => handleSimulate("win")}
                className="py-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-400 text-center cursor-pointer transition active:scale-95"
              >
                🏆 India Win
              </button>
            </div>

            {lastEventMessage && (
              <div className="text-[9px] font-bold text-center text-neon-gold border border-neon-gold/20 py-1 bg-neon-gold/5 rounded animate-pulse">
                {lastEventMessage}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowDemoConsole(!showDemoConsole)}
          className="px-4 py-2.5 rounded-full bg-gradient-to-r from-stadium-neon to-emerald-600 hover:to-stadium-neon text-pitch-dark font-extrabold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer z-50"
        >
          <Zap className="w-3.5 h-3.5 fill-pitch-dark" />
          <span>Simulate Events</span>
        </button>
      </div>
    </div>
  );
}
