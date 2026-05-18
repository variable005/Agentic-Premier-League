import React, { useState, useEffect, useRef } from "react";
import LandingPage from "./LandingPage";

export default function App() {
  // --- Navigation & Credentials ---
  const [currentView, setCurrentView] = useState("landing"); // "landing" or "dashboard"
  const [geminiKey, setGeminiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || "");
  const [cricApiKey, setCricApiKey] = useState(import.meta.env.VITE_CRIC_API_KEY || "");
  const [showSettings, setShowSettings] = useState(false);
  const [hasKeys, setHasKeys] = useState(true);
  const [showGeminiKeyVal, setShowGeminiKeyVal] = useState(false);
  const [showCricKeyVal, setShowCricKeyVal] = useState(false);

  // --- Match & AI State ---
  const [match, setMatch] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [lastQuestion, setLastQuestion] = useState("");
  
  // Interaction states
  const [userVoted, setUserVoted] = useState(null); 
  const [quizAnswered, setQuizAnswered] = useState(null); 
  const [quizChecked, setQuizChecked] = useState(false);
  const [commentatorPersona, setCommentatorPersona] = useState("Harsha Bhogle");
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [translatedCommentary, setTranslatedCommentary] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // --- Notification Toast ---
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);

  // --- Speech State ---
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // --- What If States ---
  const [whatIfQuery, setWhatIfQuery] = useState("");
  const [whatIfResponse, setWhatIfResponse] = useState(null);
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false);

  // --- Trajectory State ---
  const [animationKey, setAnimationKey] = useState(0);

  // --- Melbourne Historic Dataset ---
  const [isMelbourneMode, setIsMelbourneMode] = useState(true);
  const [currentBallId, setCurrentBallId] = useState(11); // Kohli's famous straight six
  const [isPlayingDataset, setIsPlayingDataset] = useState(false);

  // General loading & Simulation states
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCricApiActive, setIsCricApiActive] = useState(false);
  const [error, setError] = useState("");

  const [tempGeminiKey, setTempGeminiKey] = useState("");
  const [tempCricApiKey, setTempCricApiKey] = useState("");

  const pollingRef = useRef(null);
  const datasetTimerRef = useRef(null);

  // ────────────────────────────────────────────────────────────────────────
  // 🎙️ COUCH BUDDY AGENT & 10 NEW FEATURES STATES
  // ────────────────────────────────────────────────────────────────────────
  
  // 1. Live Chat Stream with Gemini Couch Buddy
  const [buddyChat, setBuddyChat] = useState([
    { sender: "buddy", text: "Yo bro! The couch is set, chips are in the bowl! Let's watch this legendary Melbourne chase together. What a match! Ask me anything or let's clink snacks! 🍿" }
  ]);
  const [buddyInput, setBuddyInput] = useState("");
  const [isBuddyTyping, setIsBuddyTyping] = useState(false);
  
  // 2. Snack Clink & Atmospheric Hype level
  const [hypeLevel, setHypeLevel] = useState(68);
  const [clinkActive, setClinkActive] = useState(false);
  const [cheerCount, setCheerCount] = useState(0);

  // 3. Dialect Selector ("Desi Mate", "Aussie Bro", "British Roommate")
  const [voiceDialect, setVoiceDialect] = useState("Desi Mate");

  // 4. Sneaky Quiz Hints
  const [showTriviaHint, setShowTriviaHint] = useState(false);

  // 5. Prediction Duel (Bro Bet Tracker)
  const [buddyBet, setBuddyBet] = useState(null);

  // 6. Volatile Hype History (SVG Momentum Graph)
  const [hypeHistory, setHypeHistory] = useState([68, 72, 65, 80, 85, 78, 88]);

  // Load environment variables dynamically
  useEffect(() => {
    setGeminiKey(import.meta.env.VITE_GEMINI_API_KEY || "");
    setCricApiKey(import.meta.env.VITE_CRIC_API_KEY || "");
    setHasKeys(true);
  }, []);

  // Set up live polling or Melbourne scrubber updates
  useEffect(() => {
    if (hasKeys && geminiKey && cricApiKey) {
      if (!isMelbourneMode) {
        fetchMatchData(true);
        pollingRef.current = setInterval(() => {
          fetchMatchData(false);
        }, 5000);
      } else {
        loadHistoricBall(currentBallId, true);
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [hasKeys, geminiKey, cricApiKey, isMelbourneMode]);

  // Handle Autoplay for Melbourne timeline
  useEffect(() => {
    if (isPlayingDataset && isMelbourneMode) {
      datasetTimerRef.current = setInterval(() => {
        setCurrentBallId((prev) => {
          const nextVal = prev + 1;
          if (nextVal >= 22) {
            setIsPlayingDataset(false);
            showToast("🏁 Melbourne Replay Complete!");
            return prev;
          }
          loadHistoricBall(nextVal, false);
          return nextVal;
        });
      }, 8000);
    } else {
      if (datasetTimerRef.current) clearInterval(datasetTimerRef.current);
    }
    return () => {
      if (datasetTimerRef.current) clearInterval(datasetTimerRef.current);
    };
  }, [isPlayingDataset, isMelbourneMode]);

  const showToast = (message) => {
    setSnackbarMsg(message);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 4000);
  };

  // Text-To-Speech Synthesiser
  const handleSpeakCommentary = () => {
    const speechText = translatedCommentary || activeEvent?.insight;
    if (!speechText) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      if (activeLanguage === "Hindi") {
        const hiVoice = voices.find(v => v.lang.includes("IN") && v.lang.includes("hi"));
        if (hiVoice) utterance.voice = hiVoice;
      } else if (commentatorPersona.includes("Boycott")) {
        const ukVoice = voices.find(v => v.lang.includes("GB") || v.lang.includes("en-GB"));
        if (ukVoice) utterance.voice = ukVoice;
      }

      window.speechSynthesis.speak(utterance);
      setIsAudioPlaying(true);
      utterance.onend = () => setIsAudioPlaying(false);
      utterance.onerror = () => setIsAudioPlaying(false);
    }
  };

  const handleStopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
    }
  };

  // Translate commentary persona
  const handleTranslate = async (langName) => {
    setActiveLanguage(langName);
    if (!activeEvent || !activeEvent.insight) return;
    
    if (langName === "English") {
      setTranslatedCommentary("");
      return;
    }
    if (langName === "Hindi" && activeEvent.hindi_trans) {
      setTranslatedCommentary(activeEvent.hindi_trans);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("http://localhost:8000/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
        },
        body: JSON.stringify({
          text: activeEvent.insight,
          lang: langName
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedCommentary(data.translated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Fetch Live Match score
  const fetchMatchData = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/match", {
        headers: {
          "x-gemini-key": geminiKey,
          "x-cricapi-key": cricApiKey,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Score sync offline");
      }

      const data = await res.json();
      setMatch(data.match);
      setIsCricApiActive(!data.match.is_mock);

      const event = data.active_event;
      setActiveEvent(event);
      setTranslatedCommentary("");
      setActiveLanguage("English");
      setAnimationKey(prev => prev + 1);

      if (event && event.poll_question !== lastQuestion) {
        setLastQuestion(event.poll_question);
        setUserVoted(null);
        setQuizAnswered(null);
        setQuizChecked(false);
        setShowTriviaHint(false);
        setBuddyBet(null);
        showToast(`🏏 Match Update: ${event.headline}`);
        
        // Add dynamic buddy reaction to chat
        injectBuddyAutoReaction(event);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Load Melbourne dataset ball
  const loadHistoricBall = async (ballId, showLoader = false) => {
    if (showLoader) setIsLoading(true);
    handleStopSpeaking();
    try {
      const res = await fetch("http://localhost:8000/set-ball", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
        },
        body: JSON.stringify({
          ball_id: ballId,
          persona: commentatorPersona,
        }),
      });

      if (!res.ok) throw new Error("Melbourne scrubber offline");

      const data = await res.json();
      setMatch(data.match);
      setIsCricApiActive(false);

      const event = data.active_event;
      setActiveEvent(event);
      setTranslatedCommentary("");
      setActiveLanguage("English");
      setAnimationKey(prev => prev + 1);

      setUserVoted(null);
      setQuizAnswered(null);
      setQuizChecked(false);
      setShowTriviaHint(false);
      setBuddyBet(null);
      setWhatIfResponse(null);
      setWhatIfQuery("");

      const ballStatus = data.match.status;
      
      // Update stress meters
      let newHype = Math.floor(60 + Math.random() * 35);
      if (ballStatus.includes("SIX")) {
        showToast("🚀 SIX! Phenomenal hit!");
        newHype = 98;
      } else if (ballStatus.includes("FOUR")) {
        showToast("🔥 FOUR! Beautiful stroke play!");
        newHype = 88;
      } else if (ballStatus.includes("WICKET")) {
        showToast("⚪ OUT! Wicket falls in Melbourne!");
        newHype = 95;
      }
      setHypeLevel(newHype);
      setHypeHistory(prev => [...prev.slice(1), newHype]);

      // Inject friendly auto reaction based on timeline events
      injectBuddyAutoReaction(event);

    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handlePersonaChange = async (newPersona) => {
    setCommentatorPersona(newPersona);
    handleStopSpeaking();
    if (isMelbourneMode) {
      await loadHistoricBall(currentBallId, true);
    } else {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:8000/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-gemini-key": geminiKey,
          },
          body: JSON.stringify({
            event: activeEvent?.event_type || "single",
            score_text: match?.score_text || "IND: 142/3",
            persona: newPersona,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveEvent(data);
          setTranslatedCommentary("");
          setActiveLanguage("English");
          setUserVoted(null);
          setShowTriviaHint(false);
          setBuddyBet(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveKeys = (e) => {
    e.preventDefault();
    if (!tempGeminiKey.trim()) {
      alert("Please specify a valid Gemini API Key!");
      return;
    }
    const finalGemini = tempGeminiKey.trim();
    const finalCric = tempCricApiKey.trim() || "cricfakekey987";
    
    localStorage.setItem("geminiKey", finalGemini);
    localStorage.setItem("cricApiKey", finalCric);
    setGeminiKey(finalGemini);
    setCricApiKey(finalCric);
    setHasKeys(true);
    setShowSettings(false);
    setError("");
    showToast("🔑 Keys Saved Successfully!");
  };

  const handleClearKeys = () => {
    localStorage.removeItem("geminiKey");
    localStorage.removeItem("cricApiKey");
    setGeminiKey("");
    setCricApiKey("");
    setTempGeminiKey("");
    setTempCricApiKey("");
    setHasKeys(false);
    showToast("🧹 Stored keys cleared completely!");
  };

  // Prediction Duel - Gemini buddy bets with/against you
  const handleVote = async (optionIndex) => {
    if (userVoted !== null) return;
    setUserVoted(optionIndex);
    
    // Friendly dual prediction logic
    const coinFlip = Math.random() > 0.45;
    if (coinFlip) {
      setBuddyBet(optionIndex); // bets with you
    } else {
      setBuddyBet(1 - optionIndex); // bets against you
    }

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_index: optionIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveEvent(prev => ({
          ...prev,
          votes: data.votes,
          percentages: data.percentages,
          total_votes: data.total_votes,
        }));
        showToast("🗳️ Bro Bet locked in!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWhatIfSubmit = async (e) => {
    e.preventDefault();
    if (!whatIfQuery.trim() || isWhatIfLoading) return;

    setIsWhatIfLoading(true);
    try {
      const res = await fetch("http://localhost:8000/what-if", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
        },
        body: JSON.stringify({
          query: whatIfQuery.trim(),
          score_text: match?.score_text || "IND: 142/3",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWhatIfResponse(data);
        showToast("🔮 win probability projected!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWhatIfLoading(false);
    }
  };

  const handleSimulate = async (eventType) => {
    if (isMelbourneMode) return;
    setIsSimulating(true);
    handleStopSpeaking();
    try {
      const res = await fetch(`http://localhost:8000/simulate/${eventType}`, {
        headers: { "x-gemini-key": geminiKey },
      });
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match);
        setActiveEvent(data.active_event);
        setTranslatedCommentary("");
        setActiveLanguage("English");
        setAnimationKey(prev => prev + 1);
        setUserVoted(null);
        setQuizAnswered(null);
        setQuizChecked(false);
        setShowTriviaHint(false);
        setBuddyBet(null);
        setWhatIfResponse(null);
        
        let newHype = 60;
        if (eventType === "six") newHype = 98;
        else if (eventType === "four") newHype = 88;
        else if (eventType === "wicket") newHype = 95;
        setHypeLevel(newHype);
        setHypeHistory(prev => [...prev.slice(1), newHype]);

        showToast(`⚪ Simulated: ${eventType.toUpperCase()}`);
        injectBuddyAutoReaction(data.active_event);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const getPercentage = (optionKey) => {
    if (!activeEvent || !activeEvent.votes) return 0;
    if (activeEvent.percentages && activeEvent.percentages[optionKey] !== undefined) {
      return activeEvent.percentages[optionKey];
    }
    const votes = activeEvent.votes;
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    return total === 0 ? 0 : Math.round((votes[optionKey] / total) * 100);
  };

  // Trajectory vector paths in crisp monochrome
  const renderBallTrajectorySVG = () => {
    const eventType = activeEvent?.event_type || "single";
    if (eventType === "six") {
      return (
        <g key={animationKey}>
          <path id="ballPath" d="M 60 130 Q 150 -10, 240 60" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="4 4" />
          <circle r="6" fill="#ffffff">
            <animateMotion dur="2.2s" repeatCount="1" fill="freeze"><mpath href="#ballPath" /></animateMotion>
          </circle>
        </g>
      );
    } else if (eventType === "four") {
      return (
        <g key={animationKey}>
          <path id="ballPath" d="M 60 130 Q 110 90, 150 130 Q 190 110, 220 130 L 250 130" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle r="5" fill="#ffffff">
            <animateMotion dur="2s" repeatCount="1" fill="freeze"><mpath href="#ballPath" /></animateMotion>
          </circle>
        </g>
      );
    } else if (eventType === "wicket") {
      return (
        <g key={animationKey}>
          <path id="ballPath" d="M 60 130 L 220 130" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle r="6" fill="#ffffff">
            <animateMotion dur="1.4s" repeatCount="1" fill="freeze"><mpath href="#ballPath" /></animateMotion>
          </circle>
          <rect x="218" y="115" width="4" height="25" fill="#ffffff" />
        </g>
      );
    } else {
      return (
        <g key={animationKey}>
          <path id="ballPath" d="M 60 130 Q 130 110, 200 120" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <circle r="4" fill="#a1a1aa">
            <animateMotion dur="2s" repeatCount="1" fill="freeze"><mpath href="#ballPath" /></animateMotion>
          </circle>
        </g>
      );
    }
  };

  const handleLaunchStadium = () => {
    setCurrentView("dashboard");
    if (!hasKeys) {
      setShowSettings(true);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // 🤝 INTERACTIVE COUCH BUDDY CHATBACK ACTION
  // ────────────────────────────────────────────────────────────────────────
  const handleBuddyChatSubmit = async (e) => {
    e.preventDefault();
    if (!buddyInput.trim() || isBuddyTyping) return;

    const userMessage = buddyInput.trim();
    setBuddyChat(prev => [...prev, { sender: "user", text: userMessage }]);
    setBuddyInput("");
    setIsBuddyTyping(true);

    try {
      const res = await fetch("http://localhost:8000/couch-buddy-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
        },
        body: JSON.stringify({
          query: userMessage,
          score_text: match?.score_text || "IND: 135/4",
          recent_ball: match?.recent_ball || ".",
          status: match?.status || "Live match action",
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Format response based on dialect state
        let formattedReply = data.reply;
        if (voiceDialect === "Aussie Bro") {
          formattedReply = "Crikey mate! " + formattedReply + " Let's grab another cold one! 🍻";
        } else if (voiceDialect === "British Roommate") {
          formattedReply = "Indubitably. " + formattedReply + " Splendid cricket we are witnessing, eh?";
        }

        setBuddyChat(prev => [...prev, { sender: "buddy", text: formattedReply }]);
      } else {
        throw new Error();
      }
    } catch (e) {
      setBuddyChat(prev => [...prev, { sender: "buddy", text: "Bro, my brain lagged for a second! But no worries, this match is getting wild! 🏏" }]);
    } finally {
      setIsBuddyTyping(false);
    }
  };

  // Automatically inject reactions as user scrubs or play progresses
  const injectBuddyAutoReaction = async (event) => {
    if (!event) return;
    
    // 1. Instantly show a temporary slang buddy reaction for immediate UI response
    const slangSix = {
      "Desi Mate": "OH MY GOD BHAI! WHAT A MONSTER SHOT! Virat is a cheat code! 🚀👑",
      "Aussie Bro": "Holy cow mate! Absolute massive strike straight back over the bowler! Unreal! 🍻",
      "British Roommate": "Good heavens, that is a majestic straight drive! Simply gorgeous shot!"
    };

    const slangWicket = {
      "Desi Mate": "Arre yaar, no way! DK got stumped... My heart rate is breaking records here! 😭💔",
      "Aussie Bro": "Strewth! Nawaz spun it low and grabbed him! Absolute disaster! 😰",
      "British Roommate": "Oh dear, Karthik has been stumped. Deeply concerning moment for the chase."
    };

    const slangSingle = {
      "Desi Mate": "Strike rotated, simple single. Keep it deep and let's lock in! 🤝",
      "Aussie Bro": "Easy single mate. Build the stand, no silly business now! 🏏",
      "British Roommate": "Splendidly run single. Sensible strike rotation is key here."
    };

    let localText = "Bro, look at this tactical split! What a game!";
    if (event.event_type === "six") {
      localText = slangSix[voiceDialect];
    } else if (event.event_type === "wicket") {
      localText = slangWicket[voiceDialect];
    } else {
      localText = slangSingle[voiceDialect];
    }

    setBuddyChat(prev => [...prev, { sender: "buddy", text: localText }]);

    // 2. Query live Gemini API in the background to fetch a custom reaction for this specific moment
    try {
      const res = await fetch("http://localhost:8000/couch-buddy-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiKey,
        },
        body: JSON.stringify({
          query: `Give me a crazy live reaction about that last play. What do you think about it?`,
          score_text: match?.score_text || "IND: 135/4",
          recent_ball: match?.recent_ball || ".",
          status: match?.status || "Live match action",
        })
      });
      if (res.ok) {
        const data = await res.json();
        let formattedReply = data.reply;
        if (voiceDialect === "Aussie Bro") {
          formattedReply = "Crikey mate! " + formattedReply;
        } else if (voiceDialect === "British Roommate") {
          formattedReply = "Indubitably. " + formattedReply;
        }
        setBuddyChat(prev => [...prev, { sender: "buddy", text: `💬 Live Gemini reaction: "${formattedReply}"` }]);
      }
    } catch (e) {
      // quiet fallback if API keys are not entered yet
    }
  };

  // Clink Beer/Snacks Interaction
  const handleClink = () => {
    setClinkActive(true);
    setCheerCount(prev => prev + 1);
    const newHype = Math.min(100, hypeLevel + 8);
    setHypeLevel(newHype);
    setHypeHistory(prev => [...prev.slice(1), newHype]);

    setBuddyChat(prev => [...prev, { 
      sender: "buddy", 
      text: voiceDialect === "Aussie Bro" 
        ? "🍻 CLINK! Good on ya mate! Let's roar for the next ball!" 
        : "🍻 Cheering with you bhai! Clink! Let's go!" 
    }]);

    setTimeout(() => {
      setClinkActive(false);
    }, 1000);
    showToast("🍻 CLINK! Snacks Cheer Boosted!");
  };

  // Snack night recommendations based on tension level
  const getPizzaRecommendation = () => {
    if (hypeLevel > 90) {
      return { food: "🍕 Hot Volcano Pizza", drink: "☕ Double Shot Espresso / Chamomile Tea (Stress relief!)" };
    } else if (hypeLevel > 75) {
      return { food: "🍟 Crunchy Salted French Fries", drink: "🥤 Soda on Rocks" };
    }
    return { food: "🍿 Light Buttered Popcorn", drink: "💧 Sparkling Water" };
  };

  // Get physical buddy actions based on tension meter
  const getPhysicalAction = () => {
    if (hypeLevel > 90) {
      return "😱 Screaming into couch cushions & pacing the room!";
    } else if (hypeLevel > 78) {
      return "😰 Biting fingernails, refusing to look at the screen.";
    }
    return "🍿 Casually munching popcorn, feet resting on table.";
  };

  if (currentView === "landing") {
    return <LandingPage onEnter={handleLaunchStadium} />;
  }

  const pizzaRecommendation = getPizzaRecommendation();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#d4d4d8] flex flex-col font-sans antialiased overflow-x-hidden selection:bg-[#ffffff] selection:text-[#000000]">
      
      {/* Toast Notification Pop-up */}
      {showSnackbar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-[#18181b] border border-white/10 px-5 py-3 rounded-lg shadow-2xl flex items-center gap-2.5">
            <span className="text-white text-base">●</span>
            <span className="text-xs font-bold font-mono tracking-wide text-white">{snackbarMsg}</span>
          </div>
        </div>
      )}

      {/* Monochrome Top Header Bar */}
      <header className="h-16 bg-[#09090b] border-b border-white/5 px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView("landing")}
            className="text-xs font-bold font-mono text-gray-500 hover:text-white transition-colors animate-pulse"
          >
            ← Exit Stadium
          </button>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <span className="text-sm font-extrabold tracking-widest text-white flex items-center gap-2">
            🏏 12TH MAN <span className="text-[9px] tracking-wider font-mono bg-white text-black px-2 py-0.5 rounded font-black uppercase">BUDDY DESK</span>
          </span>
        </div>

        {/* Global Dialect Settings & keys */}
        <div className="flex items-center gap-3">
          {/* FEATURE 8: Voice Dialect Dial selector */}
          <div className="flex items-center gap-1 bg-black p-1 rounded border border-white/5 text-[9px] font-mono">
            <span className="text-gray-500 px-1">Dialect:</span>
            {["Desi Mate", "Aussie Bro", "British Roommate"].map((dl) => (
              <button
                key={dl}
                onClick={() => {
                  setVoiceDialect(dl);
                  showToast(`🗣️ Voice persona: ${dl}`);
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  voiceDialect === dl ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"
                }`}
              >
                {dl.split(" ")[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMelbourneMode(!isMelbourneMode)}
            className="mono-tag mono-tag-outline text-[9px] cursor-pointer hover:border-white transition-all"
          >
            {isMelbourneMode ? "🎮 Switch to Live Score" : "💿 Switch to Melbourne Replay"}
          </button>

            {/* Settings button removed, API key is hardcoded */}
        </div>
      </header>

      {/* Main Unified 3-Column Sports Dashboard layout */}
      <main className="flex-1 max-w-[1500px] mx-auto w-full px-4 py-6 md:px-6 space-y-6">

        {/* Couch Buddy Greeting / Dynamic Banner */}
        <div className="mono-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-white bg-[#18181b]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛋️</span>
            <div>
              <span className="mono-tag mono-tag-solid text-[8px] tracking-widest font-mono">Couch Buddy Mode Active</span>
              <p className="text-xs text-white font-semibold mt-1">
                "We are watching this live together, bro! I'm tracking all 24 parameters in real time." — Gemini
              </p>
            </div>
          </div>
          
          {/* FEATURE 3: Virtual Snack / Beer Clinker */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClink}
              className={`mono-btn mono-btn-solid h-9 px-4 rounded text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                clinkActive ? "scale-110 border-white bg-zinc-200" : ""
              }`}
            >
              <span>🍻 Clink Drinks!</span>
              <span className="font-mono text-[9px] bg-black text-white px-1.5 py-0.5 rounded">{cheerCount} cheers</span>
            </button>
          </div>
        </div>

        {/* Minimal Scoreboard LCD Box */}
        <div className="mono-card p-6 relative overflow-hidden" style={{ backgroundColor: "#18181b" }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="mono-tag mono-tag-solid flex items-center gap-1.5">
                  <span className="mono-live-blink w-1.5 h-1.5 rounded-full bg-black inline-block"></span>
                  {match?.team_1} vs {match?.team_2}
                </span>
                <span className="mono-tag mono-tag-outline">{isMelbourneMode ? "HISTORICAL REPLAY" : "LIVE PLAY"}</span>
              </div>
              
              <h2 className="text-xl font-extrabold tracking-tight text-white uppercase">
                {match?.name || "Initializing Stadium Desk..."}
              </h2>
              
              <p className="text-[11px] font-bold text-gray-400 mt-1 font-mono uppercase tracking-widest">
                {match?.status || "Aligning Live Play Vectors..."}
              </p>
            </div>

            {/* Monochrome Score Panel */}
            <div className="mono-lcd rounded-xl p-4 flex items-center gap-6 min-w-[280px]">
              <div className="border-r border-white/10 pr-6">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Live Score</p>
                <p className="text-2xl font-extrabold text-white tracking-tight mt-1 font-mono">
                  {match?.score_text.split(" ")[1] || "135/4"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Overs completed</p>
                <p className="text-lg font-bold text-white font-mono mt-1">
                  {match?.overs} Overs
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1 font-mono">
                  <span>Last ball:</span>
                  <span className="w-5 h-5 bg-white text-black font-extrabold rounded-full flex items-center justify-center text-[10px] shadow-sm">
                    {match?.recent_ball || "."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-transparent border border-white/10 p-4 rounded-xl flex items-start gap-3">
            <span className="text-base">⚠️</span>
            <div className="text-xs font-mono">
              <p className="font-bold text-white uppercase">Credentials Required</p>
              <p className="mt-0.5 text-gray-400">{error}</p>
              <button onClick={() => setShowSettings(true)} className="mt-2 font-black text-white hover:underline cursor-pointer">Configure API keys</button>
            </div>
          </div>
        )}

        {/* 3-Column Unified Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* COLUMN 1: 🏟️ STADIUM CENTER (Trajectory SVG, Replay deck, Director Cuts) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🏟️</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Stadium Center</h3>
            </div>

            {/* SVG Trajectory pitch */}
            <div className="mono-pitch-container p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white font-mono">Flight Trajectory Vector</span>
                <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white uppercase">SVG pitch strip</span>
              </div>

              <div className="bg-black rounded-xl p-4 flex items-center justify-center border border-white/5 shadow-inner">
                <svg viewBox="0 0 300 180" className="w-full h-auto">
                  <ellipse cx="150" cy="90" rx="140" ry="85" fill="#000000" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3 3" />
                  <ellipse cx="150" cy="90" rx="95" ry="55" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
                  
                  {/* Pitch rectangle */}
                  <rect x="50" y="115" width="200" height="30" fill="#18181b" stroke="#3f3f46" strokeWidth="1" rx="2" />
                  <line x1="75" y1="115" x2="75" y2="145" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                  <line x1="225" y1="115" x2="225" y2="145" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                  
                  {/* Left Wickets */}
                  <rect x="73" y="125" width="2" height="10" fill="#ffffff" />
                  {/* Right Wickets */}
                  <rect x="223" y="120" width="2" height="20" fill="#ffffff" />
                  
                  {/* Text */}
                  <text x="150" y="25" fill="rgba(255,255,255,0.15)" fontSize="7" textAnchor="middle" fontFamily="monospace">MELBOURNE OUTFIELD BOUNDARY</text>
                  
                  {/* Ball path rendering */}
                  {renderBallTrajectorySVG()}
                </svg>
              </div>

              {/* Trajectory statistics metadata */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-[#000000] p-2 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-gray-500 uppercase">Flight path</span>
                  <span className="text-white font-bold">
                    {activeEvent?.event_type === "six" ? "Parabola Arc" : activeEvent?.event_type === "four" ? "Double Bounce" : activeEvent?.event_type === "wicket" ? "Strike Wicket" : "Ground Play"}
                  </span>
                </div>
                <div className="bg-[#000000] p-2 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-gray-500 uppercase">Velocity</span>
                  <span className="text-white font-bold">142 km/h</span>
                </div>
                <div className="bg-[#000000] p-2 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-gray-500 uppercase">Ball Run</span>
                  <span className="text-white font-bold">{match?.recent_ball || "0"} Runs</span>
                </div>
              </div>
            </div>

            {/* Scrubber timeline deck */}
            {isMelbourneMode ? (
              <div className="mono-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>💿</span>
                    <span className="text-xs font-bold text-white font-mono">Melbourne Timestamps</span>
                  </div>
                  <span className="mono-tag mono-tag-outline text-[8px]">Overs 17-20</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Virat Kohli Chase Deck</span>
                    <span className="text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded font-bold">Ball {currentBallId}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="21"
                    value={currentBallId}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setCurrentBallId(val);
                      loadHistoricBall(val, false);
                    }}
                    className="w-full mono-slider"
                  />
                </div>

                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      const val = Math.max(0, currentBallId - 1);
                      setCurrentBallId(val);
                      loadHistoricBall(val, false);
                    }}
                    disabled={currentBallId === 0}
                    className="p-2.5 bg-black border border-white/5 hover:border-white rounded-lg text-white disabled:opacity-20 cursor-pointer transition-all text-xs"
                    title="Previous Delivery"
                  >
                    ◀◀
                  </button>

                  <button
                    onClick={() => setIsPlayingDataset(!isPlayingDataset)}
                    className={`px-4 py-2 rounded-lg font-bold text-[9px] tracking-wider transition-all cursor-pointer ${
                      isPlayingDataset ? "bg-white text-black font-black" : "bg-transparent border border-white/20 text-white"
                    }`}
                  >
                    {isPlayingDataset ? "⏹ STOP PLAYBACK" : "▶ AUTOPLAY SCRUB"}
                  </button>

                  <button
                    onClick={() => {
                      const val = Math.min(21, currentBallId + 1);
                      setCurrentBallId(val);
                      loadHistoricBall(val, false);
                    }}
                    disabled={currentBallId === 21}
                    className="p-2.5 bg-black border border-white/5 hover:border-white rounded-lg text-white disabled:opacity-20 cursor-pointer transition-all text-xs"
                    title="Next Delivery"
                  >
                    ▶▶
                  </button>
                </div>
              </div>
            ) : (
              <div className="mono-card p-5 space-y-3">
                <span className="text-xs font-bold text-white font-mono block">Simulation Triggers</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSimulate("wicket")}
                    disabled={isSimulating}
                    className="py-2 px-2 bg-transparent border border-white/10 hover:border-white rounded-lg text-center cursor-pointer transition-all text-[11px] font-mono text-white"
                  >
                    OUT
                  </button>
                  <button
                    onClick={() => handleSimulate("six")}
                    disabled={isSimulating}
                    className="py-2 px-2 bg-transparent border border-white/10 hover:border-white rounded-lg text-center cursor-pointer transition-all text-[11px] font-mono text-white"
                  >
                    SIX
                  </button>
                  <button
                    onClick={() => handleSimulate("four")}
                    disabled={isSimulating}
                    className="py-2 px-2 bg-transparent border border-white/10 hover:border-white rounded-lg text-center cursor-pointer transition-all text-[11px] font-mono text-white"
                  >
                    FOUR
                  </button>
                </div>
              </div>
            )}

            {/* FEATURE 10: Match Night Pizza & Drink Advisor */}
            <div className="mono-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">🍕 MATCH NIGHT COUCH SNACK ADVISOR</p>
                <span className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase font-mono">AI suggest</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="bg-black p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-gray-500 uppercase">SUGGESTED GRUB</span>
                  <span className="text-white font-bold">{pizzaRecommendation.food}</span>
                </div>
                <div className="bg-black p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[8px] text-gray-500 uppercase">SUGGESTED DRINK</span>
                  <span className="text-white font-bold">{pizzaRecommendation.drink}</span>
                </div>
              </div>
            </div>
          </section>

          {/* COLUMN 2: 🎙️ ATMOSPHERE & COUCH CHAT (Banter Stream, Dialect Chatbox, Commentary audio) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎙️</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Atmosphere Arena</h3>
            </div>

            {/* FEATURE 1 & 2: Couch Buddy Live Chat & Talkback Chatbox */}
            <div className="mono-card p-5 space-y-4 relative flex flex-col h-[380px]">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span className="text-xs font-bold text-white font-mono">Chat with Gemini Buddy</span>
                </div>
                <span className="text-[8px] border border-white/10 px-2 py-0.5 rounded text-gray-400 font-mono">COUCH MATES</span>
              </div>

              {/* Chat bubbles list */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                {buddyChat.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">
                      {msg.sender === "user" ? "You (Couch Mate)" : `Gemini (${voiceDialect})`}
                    </span>
                    <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-transparent border border-white/15 text-white"
                        : "bg-white text-black font-semibold"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBuddyTyping && (
                  <div className="flex flex-col items-start">
                    <span className="text-[8px] text-gray-500 font-mono mb-1 uppercase">Gemini is thinking...</span>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-1 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Talkback input box form */}
              <form onSubmit={handleBuddyChatSubmit} className="flex gap-2 shrink-0 pt-2 border-t border-white/5">
                <input
                  type="text"
                  value={buddyInput}
                  onChange={(e) => setBuddyInput(e.target.value)}
                  placeholder={`Speak to Gemini mate... (${voiceDialect})`}
                  className="flex-1 mono-input"
                  required
                />
                <button
                  type="submit"
                  disabled={isBuddyTyping}
                  className="mono-btn mono-btn-solid h-9 px-4 rounded text-xs font-bold"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Real-time commentary box */}
            <div className="mono-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">Traditional Broadcast Box</span>
                
                {/* Commentator Persona Toggles */}
                <div className="flex items-center gap-1 bg-[#000000] p-1 rounded border border-white/5 text-[9px] font-mono">
                  {["Harsha", "Ravi", "Boycott"].map((per) => {
                    const persona = per === "Harsha" ? "Harsha Bhogle" : per === "Ravi" ? "Ravi Shastri" : "Geoff Boycott";
                    return (
                      <button
                        key={per}
                        onClick={() => handlePersonaChange(persona)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                          commentatorPersona === persona ? "bg-white text-black font-extrabold" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {per}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Translation bar */}
              <div className="flex items-center justify-between bg-[#000000] p-2 rounded-lg text-[10px] font-mono border border-white/5">
                <span className="text-gray-400">Broadcast translation:</span>
                <div className="flex items-center gap-1">
                  {["English", "Hindi", "Spanish", "Aussie"].map((ln) => (
                    <button
                      key={ln}
                      onClick={() => handleTranslate(ln)}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        activeLanguage === ln ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {ln}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] text-gray-400 font-mono">Broadcast loading...</p>
                </div>
              ) : activeEvent ? (
                <div className="space-y-4">
                  {isTranslating ? (
                    <div className="py-4 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] text-gray-400 font-mono">Gemini Translating...</span>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold leading-relaxed text-white italic tracking-wide">
                      &ldquo;{translatedCommentary || activeEvent.insight}&rdquo;
                    </p>
                  )}

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    {!isAudioPlaying ? (
                      <button
                        onClick={handleSpeakCommentary}
                        className="mono-btn mono-btn-solid h-8 px-4 rounded text-[9px]"
                      >
                        🔊 Speak commentary
                      </button>
                    ) : (
                      <button
                        onClick={handleStopSpeaking}
                        className="bg-transparent border border-white/20 text-white hover:border-white px-4 py-2 rounded text-[9px] font-bold uppercase cursor-pointer transition-all"
                      >
                        Stop reading
                      </button>
                    )}

                    {isAudioPlaying && (
                      <div className="flex items-end gap-0.5 h-3 pr-1">
                        <div className="mono-wave-bar animate-[pulse_0.4s_infinite_alternate] h-2"></div>
                        <div className="mono-wave-bar animate-[pulse_0.6s_infinite_alternate] h-4"></div>
                        <div className="mono-wave-bar animate-[pulse_0.5s_infinite_alternate] h-3"></div>
                        <div className="mono-wave-bar animate-[pulse_0.7s_infinite_alternate] h-1"></div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No broadcast data available.</p>
              )}
            </div>

            {/* Stadium dynamic crowd chants */}
            {activeEvent?.crowd_chant && (
              <div className="mono-card p-5 text-center space-y-2 border-l border-white">
                <p className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">📢 DYNAMIC CROWD SLOGAN CHANT</p>
                <p className="text-xs font-extrabold text-white tracking-wide">📣 &ldquo;{activeEvent.crowd_chant}&rdquo;</p>
                {activeEvent?.decibel_cheer && (
                  <p className="text-[10px] text-gray-400 font-mono">Cheer decibels: <span className="text-white font-bold">{activeEvent.decibel_cheer}</span></p>
                )}
              </div>
            )}
          </section>

          {/* COLUMN 3: 🧠 TACTICAL HUB & FANS (What-if, prediction duel bets, trivia hints, stress meters) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🧠</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white">Tactics & Fans</h3>
            </div>

            {/* FEATURE 5: Friend's Couch Stress Rage Gauge */}
            <div className="mono-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">🤬 GEMINI'S COUCH STRESS GAUGE</span>
                <span className="text-[8px] bg-white text-black font-extrabold px-1.5 py-0.5 rounded font-mono uppercase">
                  {hypeLevel > 90 ? "MAX CRITICAL" : hypeLevel > 75 ? "TENSE" : "CHILL"}
                </span>
              </div>

              {/* Stress metric details */}
              <div className="space-y-2">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${hypeLevel}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400">
                  <span>Heart rate: {90 + Math.floor(hypeLevel * 0.5)} BPM</span>
                  <span>Atmosphere Tension: {hypeLevel}%</span>
                </div>
                <p className="text-[11px] font-mono text-white bg-black p-3 rounded-lg border border-white/5 italic">
                  💡 Gemini couch action: <span className="font-bold">{getPhysicalAction()}</span>
                </p>
              </div>
            </div>

            {/* FEATURE 9: Volatile Hype History (SVG Momentum Graph) */}
            <div className="mono-card p-5 space-y-3">
              <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono block">📈 ATMOSPHERE BANTER VOLATILITY (MOMENTUM)</span>
              
              <div className="bg-black p-2 rounded-lg border border-white/5 flex items-center justify-center">
                <svg viewBox="0 0 200 60" className="w-full h-12">
                  <path
                    d={`M 10 ${60 - hypeHistory[0] * 0.5} 
                        L 40 ${60 - hypeHistory[1] * 0.5} 
                        L 70 ${60 - hypeHistory[2] * 0.5} 
                        L 100 ${60 - hypeHistory[3] * 0.5} 
                        L 130 ${60 - hypeHistory[4] * 0.5} 
                        L 160 ${60 - hypeHistory[5] * 0.5} 
                        L 190 ${60 - hypeHistory[6] * 0.5}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {hypeHistory.map((val, idx) => (
                    <circle key={idx} cx={10 + idx * 30} cy={60 - val * 0.5} r="3" fill="#ffffff" />
                  ))}
                  <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.8" strokeDasharray="2 2" />
                </svg>
              </div>
            </div>

            {/* FEATURE 4: Gemini's Couch Tactical Notebook */}
            {activeEvent && (
              <div className="mono-card p-5 space-y-3 border-l-2 border-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <span>📓</span> Gemini's Tactical Couch Notebook
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono uppercase">doodles</span>
                </div>
                <div className="p-4 bg-black rounded-lg border border-white/5 font-mono text-xs text-gray-300 leading-relaxed relative">
                  <div className="absolute top-2 right-2 text-[9px] text-gray-600">Napkin scratch #04</div>
                  <p className="italic">
                    "Yo bro, {activeEvent.coach_review.replace(".", "")}. Also, {activeEvent.win_prob_explainer.replace(".", "")}. Rauf/Nawaz look completely rattled by our massive pressure on the boundary lines!"
                  </p>
                </div>
              </div>
            )}

            {/* What-if simulation box */}
            <div className="mono-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span>🔮</span>
                <span className="text-xs font-bold text-white font-mono">What-If Oracle</span>
              </div>

              <form onSubmit={handleWhatIfSubmit} className="space-y-2">
                <input
                  type="text"
                  value={whatIfQuery}
                  onChange={(e) => setWhatIfQuery(e.target.value)}
                  placeholder="e.g. What if bowling team shifts fielders closer?"
                  className="w-full bg-[#000000] border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isWhatIfLoading}
                  className="w-full mono-btn mono-btn-solid h-9 rounded text-xs font-bold"
                >
                  {isWhatIfLoading ? (
                    <div className="w-3.5 h-3.5 border border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Project What-If Scenario"
                  )}
                </button>
              </form>

              {whatIfResponse && (
                <div className="p-3.5 rounded-lg bg-[#000000] border border-white/5 space-y-2 font-mono text-[11px]">
                  <p className="text-[9px] text-white font-bold uppercase">PROJECTION SHIFT CALCULATOR:</p>
                  <p className="text-gray-300 italic leading-relaxed">&ldquo;{whatIfResponse.projection}&rdquo;</p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-white font-bold">
                    <span>Win Probability change:</span>
                    <span>{whatIfResponse.prob_shift}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Predictor poll & FEATURE 6: Prediction Duel Bet tracker */}
            {activeEvent && activeEvent.poll_question && (
              <div className="mono-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono block">📊 Prediction Duel Bet Tracker</span>
                  <span className="text-[8px] bg-white text-black font-extrabold px-1.5 py-0.5 rounded">BRO BET</span>
                </div>
                <p className="text-xs font-bold text-white">{activeEvent.poll_question}</p>
                
                <div className="space-y-2">
                  {activeEvent.options && activeEvent.options.map((option, idx) => {
                    const percent = idx === 0 ? getPercentage("option_0") : getPercentage("option_1");
                    const isUserVoted = userVoted === idx;
                    const isBuddyVoted = buddyBet === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleVote(idx)}
                        disabled={userVoted !== null}
                        className={`w-full text-left p-3 rounded-lg border relative overflow-hidden transition-all group cursor-pointer ${
                          userVoted !== null
                            ? isUserVoted
                              ? "bg-white/10 border-white text-white font-semibold"
                              : "bg-transparent border-white/5 text-gray-600"
                            : "bg-[#000000] border-white/5 hover:border-white text-gray-200"
                        }`}
                      >
                        {userVoted !== null && (
                          <div className="absolute left-0 top-0 h-full bg-white/5 transition-all duration-700" style={{ width: `${percent}%` }}></div>
                        )}
                        <div className="flex items-center justify-between relative z-10 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span>{option}</span>
                            {isUserVoted && <span className="text-[8px] bg-white text-black px-1 py-0.5 rounded font-black font-mono">YOUR BET</span>}
                            {isBuddyVoted && <span className="text-[8px] border border-white text-white px-1 py-0.5 rounded font-black font-mono">BUDDY BET</span>}
                          </div>
                          {userVoted !== null && <span className="font-mono font-bold text-xs">{percent}%</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {userVoted !== null && (
                  <p className="text-[10px] font-mono text-gray-400 text-center">
                    {buddyBet === userVoted 
                      ? "🤝 Gemini has chosen the same bet! Mates think alike!" 
                      : "🔥 Prediction duel is on! Gemini is betting against you!"}
                  </p>
                )}
              </div>
            )}

            {/* Trivia Quiz & FEATURE 7: Sneaky Hints */}
            {activeEvent && activeEvent.quiz_question && (
              <div className="mono-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono block">🧠 Trivia Quiz</span>
                  
                  {/* Whispered Hint Button */}
                  <button
                    onClick={() => {
                      setShowTriviaHint(!showTriviaHint);
                      showToast("🤫 Gemini whispered a sneaky hint!");
                    }}
                    className="text-[9px] font-mono border border-white/20 hover:border-white text-white px-2 py-0.5 rounded cursor-pointer transition-all"
                  >
                    🤫 Get Buddy Hint
                  </button>
                </div>
                <p className="text-xs font-bold text-white">{activeEvent.quiz_question}</p>
                
                {/* Whispered Hint Output */}
                {showTriviaHint && (
                  <div className="p-2.5 rounded-lg bg-black border border-dashed border-white/20 text-[10px] font-mono text-white/70 italic">
                    🤫 *Gemini whispers: "Bhai, Ashwin was the absolute hero who chipped it over mid-off to finish the chase calmly! Select Option 2! Let's get this correct!* 😉"
                  </div>
                )}

                <div className="space-y-2">
                  {activeEvent.quiz_options && activeEvent.quiz_options.map((option, idx) => {
                    const isSelected = quizAnswered === idx;
                    const isCorrect = idx === activeEvent.quiz_answer_idx;

                    let btnStyle = "bg-[#000000] border-white/5 text-gray-300";
                    if (quizChecked) {
                      if (isCorrect) {
                        btnStyle = "bg-white/10 border-white text-white font-bold";
                      } else if (isSelected) {
                        btnStyle = "bg-transparent border-red-500/20 text-red-400";
                      } else {
                        btnStyle = "bg-transparent border-white/5 text-gray-600";
                      }
                    } else if (isSelected) {
                      btnStyle = "bg-white/10 border-white text-white font-bold";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => { if (!quizChecked) setQuizAnswered(idx); }}
                        disabled={quizChecked}
                        className={`w-full text-left p-2.5 rounded-lg border text-[11px] cursor-pointer transition-all ${btnStyle}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {!quizChecked ? (
                  <button
                    onClick={() => { if (quizAnswered !== null) setQuizChecked(true); }}
                    disabled={quizAnswered === null}
                    className="w-full mono-btn mono-btn-solid h-8 rounded text-xs font-bold"
                  >
                    Verify Answer
                  </button>
                ) : (
                  <p className="text-[10px] text-center text-gray-400 font-mono">
                    {quizAnswered === activeEvent.quiz_answer_idx 
                      ? "🎉 Correct! strategic record matched." 
                      : "❌ Incorrect, try again next ball!"}
                  </p>
                )}
              </div>
            )}
          </section>

        </div>

        {/* ✨ GEMINI 12TH MAN: HIGHLY VISUAL EXTENDED ANALYTICS */}
        {activeEvent && (
          <section className="pt-8 border-t border-white/10 mt-10">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="text-xl">👁️</span> Visual Broadcast Analytics
            </h2>
            
            {/* Top Row: Visual Cards & Pitch Map */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              
              {/* Feature 1: Broadcast Details Missed (Wide) */}
              <div className="md:col-span-4 bg-gradient-to-r from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Director's Cut
                </span>
                <p className="text-xs text-white font-serif italic leading-relaxed z-10 relative">
                  "{activeEvent.micro_details_missed || "Analyzing hidden camera angles..."}"
                </p>
              </div>

              {/* Feature 2: Batsman Ultimate Card */}
              <div className="md:col-span-4 bg-gradient-to-br from-green-900/40 via-black to-black border border-green-500/30 rounded-xl p-4 relative">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    🏏
                  </div>
                  <div>
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider block">Striker Profile</span>
                    <h3 className="text-white font-black text-lg font-mono">BATSMAN</h3>
                  </div>
                </div>
                <p className="text-[10px] text-gray-300 font-mono mb-3 h-8 line-clamp-2">{activeEvent.player_card_batsman || "Fetching player database..."}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-bold text-gray-400"><span>POWER</span><span>94</span></div>
                  <div className="w-full bg-black rounded-full h-1"><div className="bg-green-500 h-1 rounded-full w-[94%]"></div></div>
                  <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1"><span>TIMING</span><span>88</span></div>
                  <div className="w-full bg-black rounded-full h-1"><div className="bg-green-400 h-1 rounded-full w-[88%]"></div></div>
                </div>
              </div>

              {/* Feature 3: Bowler Ultimate Card */}
              <div className="md:col-span-4 bg-gradient-to-bl from-red-900/40 via-black to-black border border-red-500/30 rounded-xl p-4 relative">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    🎯
                  </div>
                  <div>
                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider block">Attack Profile</span>
                    <h3 className="text-white font-black text-lg font-mono">BOWLER</h3>
                  </div>
                </div>
                <p className="text-[10px] text-gray-300 font-mono mb-3 h-8 line-clamp-2">{activeEvent.player_card_bowler || "Fetching attack database..."}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-bold text-gray-400"><span>THREAT</span><span>91</span></div>
                  <div className="w-full bg-black rounded-full h-1"><div className="bg-red-500 h-1 rounded-full w-[91%]"></div></div>
                  <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1"><span>ACCURACY</span><span>85</span></div>
                  <div className="w-full bg-black rounded-full h-1"><div className="bg-red-400 h-1 rounded-full w-[85%]"></div></div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Graphical Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              
              {/* Feature 4: Pitch Map SVG */}
              <div className="col-span-2 bg-[#09090b] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-16 bg-[#2d4a22] rounded flex flex-col justify-between py-1 px-2 relative border border-white/20">
                  <div className="w-full h-0.5 bg-white/50"></div>
                  {/* Fake heat map glow */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400/60 rounded-full blur-[2px]"></div>
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_red]"></div>
                  <div className="w-full h-0.5 bg-white/50"></div>
                </div>
                <div>
                  <span className="text-[9px] text-yellow-500 font-bold uppercase block mb-1">Pitch Zone</span>
                  <p className="text-[10px] text-white font-mono leading-tight">{activeEvent.pitch_map_zone || "Mapping..."}</p>
                </div>
              </div>

              {/* Feature 5: Bat Speed Dial */}
              <div className="col-span-2 bg-[#09090b] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path className="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-purple-500" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                  <span className="absolute text-[8px] font-bold text-white">⚡</span>
                </div>
                <div>
                  <span className="text-[9px] text-purple-400 font-bold uppercase block mb-1">Bat Speed Est.</span>
                  <p className="text-[10px] text-white font-mono leading-tight">{activeEvent.bat_speed_estimate || "Calculating..."}</p>
                </div>
              </div>

              {/* Feature 6, 7, 8: Tactical text bits */}
              <div className="col-span-1 flex flex-col gap-2">
                <div className="bg-[#09090b] border border-white/10 rounded p-2 h-full">
                  <span className="text-[8px] text-gray-500 font-bold uppercase block">Footwork</span>
                  <p className="text-[9px] text-white font-mono truncate">👟 {activeEvent.footwork_analysis}</p>
                </div>
                <div className="bg-[#09090b] border border-white/10 rounded p-2 h-full">
                  <span className="text-[8px] text-gray-500 font-bold uppercase block">History</span>
                  <p className="text-[9px] text-blue-300 font-mono truncate">📜 {activeEvent.historical_stat}</p>
                </div>
              </div>

              <div className="col-span-1 flex flex-col gap-2">
                <div className="bg-[#09090b] border border-white/10 rounded p-2 h-full">
                  <span className="text-[8px] text-gray-500 font-bold uppercase block">Weakness</span>
                  <p className="text-[9px] text-red-300 font-mono truncate">🎯 {activeEvent.weakness_exploited}</p>
                </div>
                <div className="bg-[#09090b] border border-white/10 rounded p-2 h-full">
                  <span className="text-[8px] text-gray-500 font-bold uppercase block">Partnership</span>
                  <p className="text-[9px] text-yellow-300 font-mono truncate">🤝 {activeEvent.partnership_context}</p>
                </div>
              </div>

              {/* Feature 10: Next Move Alert */}
              <div className="col-span-1 bg-white border border-white rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] text-black font-black uppercase mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span> NEXT MOVE
                </span>
                <p className="text-[10px] text-black font-extrabold leading-tight">
                  {activeEvent.next_tactical_move || "Simulating tactics..."}
                </p>
              </div>

            </div>
          </section>
        )}
      </main>

    </div>
  );
}
