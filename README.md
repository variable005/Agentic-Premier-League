# Build with AI – Agentic Premier League (Google Cloud) 🏏✨

A high-fidelity, real-time **second-screen experience for cricket fans** watching live matches. This full-stack web application makes fans active participants rather than mere spectators by using **autonomous AI agents** that react to simulated ball-by-ball events in real time.

---

## 🚀 Key Features

1. **Live Cricket Scoreboard**: Classic dark-mode cricket board displaying Team A (India) vs Team B (Australia), current score, batting strike indicators, recent ball-by-ball log (color-coded dots), run rates (CRR/RRR), and bowler's spell card.
2. **Autonomous AI Commentary Agent**: Powered by **Google Gemini API**, our agent listens to live ball events and generates witty, enthusiast, Harsha Bhogle-style commentary, completely dynamically.
3. **Real-time Fan Prediction Arena**: Interactive prediction cards automatically trigger on crucial events. Fans predict what happens next (e.g. predicting the next ball result to win points).
4. **Live Fan Leaderboard**: A real-time updating point system with competitive AI fans ("Agent Dhoni", "Gemini Guru", etc.) where the user moves up or down ranks based on correct predictions.
5. **Dismissed Player Stat Cards**: If a wicket falls, Gemini automatically generates a custom statistical profile card detailing the dismissed batsman's season performance.
6. **Death Overs "Chase Mode"**: Fast-forward to the last 5 overs where the UI glows in neon alarm colors, enabling real-time win probability shifts with dynamic tactical explanations of *why* the odds are changing.
7. **Live Event Injector (Demo Panel)**: A comprehensive administrator console allowing judges and users to manually trigger events (`dot`, `single`, `double`, `four`, `six`, `wicket`, `chase_mode`, `reset`, `toggle auto-simulate`) to test all real-time AI states.
8. **Dynamic Gemini Configuration**: A collapsible settings panel allowing users to input their own `GEMINI_API_KEY` directly in the UI.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite) + Tailwind CSS v4 + Lucide Icons
- **Backend**: Python + FastAPI + WebSockets (In-memory state management, no database installation required)
- **AI Engine**: Google Gemini API (`google-genai` / fallback smart cricket agent)

---

## 💻 Quick Start Setup

### Step 1: Clone or Open Workspace
Make sure you are in the project folder:
```bash
cd /Users/hariom/Desktop/APL
```

### Step 2: Set up Python Backend
1. Install the required python libraries (FastAPI, Uvicorn, Websockets, dotenv, google-genai):
   ```bash
   pip3 install -r backend/requirements.txt
   ```
2. *(Optional)* Add your Gemini API Key in the `.env` file or directly in the UI under Settings:
   ```bash
   echo "GEMINI_API_KEY=your-api-key-here" > backend/.env
   ```
3. Run the FastAPI development server:
   ```bash
   python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The backend will be running at `http://127.0.0.1:8000`*

### Step 3: Set up React Frontend
1. Navigate into the frontend folder (or run from root with appropriate relative path):
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will open at `http://localhost:5173/`*

---

## 🏏 How to Demo the App

1. Open your browser and go to `http://localhost:5173/`.
2. Tap the **Profile Name** pill in the header to customize your Fan Name (e.g. change it from "You" to your name). Your name will sync instantly with the leaderboard.
3. Click the **Gear icon** in the top right to open the Gemini Config Drawer. Paste your Google Gemini API Key and click "Save API Key".
4. Scroll down to the **Live Event Injector** card on the bottom-right and test the triggers:
   - Click **"Single Run"** or **"Dot Ball"** to see standard ball-by-ball updates.
   - Click **"Six!"** to see a boundary trigger. A prediction card will immediately pop up in the **Fan Engagement Arena** asking you to predict what happens on the *next ball*.
   - Cast a prediction (e.g. guess "Boundary" or "Wicket").
   - Click another button (like **"Single Run"** or **"Dot Ball"**) in the Injector panel. The backend points engine will instantly evaluate your prediction, display whether you guessed correctly, and award you points on the **Leaderboard**!
   - Click **"Wicket!"** to trigger a batsman dismissal. Notice a dynamic statistical card generated about the player, and a custom fan poll card triggered by Gemini.
   - Click **"Chase Mode"** to fast-forward into the final death overs, triggering red alarm flashes, and watch the win probabilities fluctuate with detailed AI explanations.
   - Click **"Auto-Simulate"** to let the match progress automatically by itself every 12 seconds!
   - Click **"Reset Simulation"** to reset the match back to 14.0 overs at any time.
