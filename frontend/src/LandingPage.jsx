import React from "react";

const features = [
  { icon: "🎙️", title: "AI Commentators", desc: "Harsha Bhogle, Ravi Shastri & Geoff Boycott personas powered by Gemini AI" },
  { icon: "🏟️", title: "Flight Trajectory", desc: "Animated vector trajectory curves for wickets, fours, and sixes" },
  { icon: "🔮", title: "What-If Oracle", desc: "Interactive query simulator to calculate win probability projections" },
  { icon: "🌌", title: "Parallel Universes", desc: "Compares live ball plays to legendary historical cricket milestones" },
  { icon: "📊", title: "24 AI Analytica", desc: "Threat matrix splits, sentiment indices, momentum explainers & coach reports" },
  { icon: "🗳️", title: "Fan Pavilion", desc: "Real-time predictor polls, cricket quizzes, and crowd chanting models" },
];

export default function LandingPage({ onEnter }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#09090b", color: "#d4d4d8", display: "flex", flexDirection: "column", fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Editorial Monochrome Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        backgroundColor: "rgba(9,9,11,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #27272a",
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", letterSpacing: "1px" }}>🏏 12TH MAN</span>
          <span className="mono-tag mono-tag-outline" style={{ fontSize: 9 }}>STUDIO LAB</span>
        </div>
        <button 
          onClick={onEnter}
          style={{
            backgroundColor: "#ffffff", color: "#000000", border: "1px solid #ffffff",
            padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
            textTransform: "uppercase", cursor: "pointer", transition: "all 150ms ease"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e4e4e7"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
        >
          Enter Stadium →
        </button>
      </header>

      {/* Hero Section */}
      <section style={{ 
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", 
        justifyContent: "center", textAlign: "center", padding: "100px 24px 60px",
        position: "relative" 
      }}>
        
        <div style={{ maxWidth: 800, position: "relative", zIndex: 1 }}>
          {/* Subtle live indicator in monochrome */}
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: 8, 
            border: "1px solid #27272a", borderRadius: "30px", 
            padding: "5px 14px", marginBottom: 24 
          }}>
            <span className="mono-live-blink" style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ffffff" }}></span>
            <span style={{ fontSize: 10, fontWeight: "500", color: "#a1a1aa", letterSpacing: "1px", textTransform: "uppercase" }}>
              Cricket Analytics Engine · Gemini Flash
            </span>
          </div>

          <h1 style={{ 
            fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 800, color: "#ffffff", 
            lineHeight: 1.15, letterSpacing: "-1.5px", marginBottom: 20 
          }}>
            CRICKET, MINIMALIST.<br />
            POWERED BY GEMINI AI.
          </h1>

          <p style={{ fontSize: "14px", color: "#a1a1aa", maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
            An elegant, high-contrast, black-and-white sports suite. Analyze matches with 24 real-time AI metrics, commentators, What-If forecasts, and historical Melbourne replays.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button 
              onClick={onEnter} 
              style={{
                backgroundColor: "#ffffff", color: "#000000", border: "1px solid #ffffff",
                padding: "12px 24px", borderRadius: "8px", fontSize: "12px", fontWeight: "700",
                textTransform: "uppercase", cursor: "pointer", transition: "all 150ms ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#e4e4e7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              🏟️ Open Stadium
            </button>
            <a 
              href="#features" 
              style={{
                backgroundColor: "transparent", color: "#ffffff", border: "1px solid #27272a",
                padding: "12px 24px", borderRadius: "8px", fontSize: "12px", fontWeight: "700",
                textTransform: "uppercase", cursor: "pointer", transition: "all 150ms ease",
                textDecoration: "none", display: "inline-flex", alignItems: "center"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#27272a"; }}
            >
              Explore Analytics
            </a>
          </div>
        </div>

        {/* Minimal High-Contrast Scorecard Preview */}
        <div style={{ 
          marginTop: 64, maxWidth: 440, width: "100%", borderRadius: "12px", 
          border: "1px solid #27272a", backgroundColor: "#18181b", padding: "20px", 
          textAlign: "left", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 9, color: "#71717a", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>
                MELBOURNE T20 WORLD CUP
              </p>
              <p style={{ fontSize: 15, fontWeight: "800", color: "#ffffff" }}>IND vs PAK · OVER 18.5</p>
            </div>
            <span className="mono-tag mono-tag-outline">REPLAY SCRUBBER</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Live Score", "135/4"], ["Overs Completed", "18.5"], ["Target Left", "28 Runs"]].map(([lbl, val]) => (
              <div key={lbl} style={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "#71717a", marginBottom: 4, textTransform: "uppercase" }}>{lbl}</p>
                <p style={{ fontSize: 15, fontWeight: "700", color: "#ffffff", fontFamily: "'JetBrains Mono', monospace" }}>{val}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "8px" }}>
            <p style={{ fontSize: 11, color: "#a1a1aa", fontStyle: "italic", lineHeight: 1.6 }}>
              🎙️ Bhogle: "Kohli stands tall! Hits it over the bowler's head for a magnificent straight six! Unbelievable scenes at the MCG!"
            </p>
          </div>
        </div>
      </section>

      {/* Grid Features Section */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 10, fontWeight: "700", color: "#a1a1aa", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
            SYSTEM CAPABILITIES
          </p>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
            24 AI Cricket Analytics Features
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {features.map((f, i) => (
            <div 
              key={i} 
              style={{ 
                padding: "24px", border: "1px solid #27272a", borderRadius: "12px", 
                backgroundColor: "#18181b", transition: "border-color 150ms ease" 
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#27272a"; }}
            >
              <div style={{ fontSize: "24px", marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Minimal Footer */}
      <footer style={{ 
        borderTop: "1px solid #27272a", padding: "24px", 
        display: "flex", flexWrap: "wrap", gap: 16, 
        justifyContent: "space-between", fontSize: "11px", color: "#71717a",
        backgroundColor: "#09090b"
      }}>
        <p>© 2024 12th Man. Built for Cricket Hackathon with Gemini 1.5 Flash + Python FastAPI.</p>
        <p>Telemetry: CricAPI · Intel: Google Gemini</p>
      </footer>
    </div>
  );
}
