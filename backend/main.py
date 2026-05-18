import os
import asyncio
import json
import random
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We can import google-genai or google-generativeai.
# To be robust, we'll try to import and use google-genai,
# and if the API key is missing, we'll fall back to our advanced Local Cricket AI Agent.
GEMINI_AVAILABLE = False
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except Exception:
    try:
        import google.generativeai as genai_legacy
        GEMINI_AVAILABLE = True
    except Exception:
        pass

app = FastAPI(title="Agentic Premier League Backend", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global API Key management (can be updated from UI)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Mock player pools for simulation
BATTER_POOL = [
    "Virat Kohli", "Hardik Pandya", "Rishabh Pant", "Rinku Singh", 
    "Ravindra Jadeja", "Axar Patel", "MS Dhoni", "Suryakumar Yadav"
]
BOWLER_POOL = [
    "Pat Cummins", "Mitchell Starc", "Adam Zampa", "Josh Hazlewood",
    "Glenn Maxwell", "Marcus Stoinis"
]

# Database state stored in-memory for the demo
class BatterState(BaseModel):
    name: str
    runs: int
    balls: int
    fours: int
    sixes: int
    is_striker: bool

class BowlerState(BaseModel):
    name: str
    overs: float
    runs: int
    wickets: int
    balls_bowled: int

class MatchState:
    def __init__(self):
        self.reset()

    def reset(self):
        self.team_a = "India"
        self.team_b = "Australia"
        self.runs = 138
        self.wickets = 3
        self.total_balls = 84  # 14.0 overs
        self.target = 188     # Target in 20 overs (need 50 runs in 36 balls)
        
        # Match players
        self.batters = [
            BatterState(name="Virat Kohli", runs=54, balls=38, fours=5, sixes=1, is_striker=True),
            BatterState(name="Hardik Pandya", runs=14, balls=10, fours=1, sixes=1, is_striker=False)
        ]
        self.bowler = BowlerState(name="Pat Cummins", overs=2.0, runs=18, wickets=1, balls_bowled=12)
        
        self.last_balls = ["1", "6", "0", "W", "4", "1"]
        self.win_probability_a = 52
        self.win_probability_b = 48
        self.win_probability_explanation = "India needs 50 runs off 36 balls. Virat Kohli is anchoring the chase, but Pat Cummins has bowled a tight spell."
        self.commentary = "We are heading into a grandstand finish! 50 runs required from 36 balls. The crowd is electric."
        self.active_poll: Optional[Dict[str, Any]] = None
        self.chase_mode = False
        self.match_active = True
        self.auto_simulate = False
        self.dismissed_player_stat = ""

        # Leaderboard
        self.leaderboard = [
            {"username": "You", "points": 0, "rank": 4},
            {"username": "Agent Dhoni", "points": 140, "rank": 1},
            {"username": "Gemini Guru", "points": 110, "rank": 2},
            {"username": "FastAPI Fanatic", "points": 80, "rank": 3},
            {"username": "CricketCoder", "points": 50, "rank": 5}
        ]
        self.active_predictions = {} # username -> predicted option

    def get_overs_str(self) -> float:
        overs = self.total_balls // 6
        balls = self.total_balls % 6
        return float(f"{overs}.{balls}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "team_a": self.team_a,
            "team_b": self.team_b,
            "runs": self.runs,
            "wickets": self.wickets,
            "overs": self.get_overs_str(),
            "target": self.target,
            "batters": [b.dict() for b in self.batters],
            "bowler": self.bowler.dict(),
            "last_balls": self.last_balls,
            "win_probability_a": self.win_probability_a,
            "win_probability_b": self.win_probability_b,
            "win_probability_explanation": self.win_probability_explanation,
            "commentary": self.commentary,
            "active_poll": self.active_poll,
            "chase_mode": self.chase_mode,
            "match_active": self.match_active,
            "auto_simulate": self.auto_simulate,
            "dismissed_player_stat": self.dismissed_player_stat,
            "leaderboard": self.leaderboard
        }

# Instantiate Match State
match_state = MatchState()

# WebSocket Manager to broadcast changes
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial state
        await websocket.send_text(json.dumps({
            "type": "INIT_STATE",
            "data": match_state.to_dict()
        }))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                # Connection might be closed, we will clean up in disconnect
                pass

manager = ConnectionManager()

# LLM Fallback generator in case Gemini API is offline/unavailable
def fallback_cricket_agent(event_type: str, state: MatchState) -> Dict[str, Any]:
    overs = state.get_overs_str()
    runs_needed = state.target - state.runs
    balls_remaining = 120 - state.total_balls
    
    striker = next((b for b in state.batters if b.is_striker), state.batters[0])
    non_striker = next((b for b in state.batters if not b.is_striker), state.batters[1])
    bowler = state.bowler
    
    # Win probability logic
    if balls_remaining <= 0:
        win_a_pct = 100 if state.runs >= state.target else 0
    else:
        # Base probability calculation based on required run rate
        req_rate = (runs_needed / (balls_remaining / 6)) if balls_remaining > 0 else 10.0
        # If Virat Kohli is batting, add bonus chance
        has_kohli = any(b.name == "Virat Kohli" for b in state.batters)
        base = 50 + (6.0 - req_rate) * 5
        if has_kohli:
            base += 8
        win_a_pct = max(5, min(95, int(base)))
    
    win_b_pct = 100 - win_a_pct

    # Dynamic commentaries
    commentaries = {
        "dot": [
            f"Superb delivery by {bowler.name}! A dot ball that mounts pressure on {striker.name}.",
            f"Excellent line from {bowler.name}. {striker.name} plays it back to the bowler.",
            f"Direct hit missed, but that is a precious dot ball for Australia. {bowler.name} is hitting the deck hard."
        ],
        "single": [
            f"{striker.name} pushes it to deep cover for a single. Rotates the strike cleanly.",
            f"Soft hands from {striker.name}, tapping it to mid-on and sprinting for a single.",
            f"Just a single. {bowler.name} is keeping the fielders busy, not giving any room."
        ],
        "double": [
            f"Great running! {striker.name} clips it to deep midwicket and they hurry back for a second.",
            f"Cut away through point! The outfield is slightly slow, allowing them to pull off a comfortable brace."
        ],
        "four": [
            f"SHOT! {striker.name} advances and lofts it beautifully over mid-off for a boundary!",
            f"CRACK! Short and punished. {striker.name} pulls it powerfully through square leg for four!",
            f"Pure class from {striker.name}. A delicate touch past slip, racing away to the boundary."
        ],
        "six": [
            f"IT'S INTO THE STANDS! A massive six from {striker.name}, clean out of the middle!",
            f"OUT OF THE PARK! {striker.name} gets down on one knee and slog-sweeps it 95 meters!",
            f"SPECTACULAR! That is a carbon-copy trademark shot. The fans are absolute chanting in the stadium!"
        ],
        "wicket": [
            f"OUT! Clean bowled! {bowler.name} breaks the partnership! The crowd is stunned as {striker.name} has to walk.",
            f"CAUGHT! A leading edge and simple catch to mid-wicket. {bowler.name} is absolutely ecstatic, what a crucial wicket!",
            f"UP IN THE AIR AND TAKEN! {striker.name} tries to go big but miscues it. Massive blow for India!"
        ]
    }

    selected_comm = random.choice(commentaries.get(event_type, ["An action-packed delivery! The game is on a knife edge."]))

    # Generate dynamic stats for dismissed player
    dismissed_stat = ""
    if event_type == "wicket":
        dismissed_stat = f"{striker.name} scored {striker.runs} off {striker.balls} balls. Today he maintained a strike rate of {(striker.runs/striker.balls)*100:.1f}%. This season, he average 52.4 runs against pacers in the death overs."

    # Autonomously decide if we trigger a poll
    trigger_poll = False
    poll_data = None
    
    if event_type == "wicket":
        trigger_poll = True
        poll_data = {
            "question": f"Wicket fell! With {striker.name} dismissed, who will guide India home?",
            "options": [f"New Batter", f"{non_striker.name}", "Australia Wins"],
            "poll_type": "wicket_fall",
            "correct_option_index": None
        }
    elif event_type == "six":
        trigger_poll = True
        poll_data = {
            "question": f"Predict the next ball after that massive 6 by {striker.name}!",
            "options": ["Dot Ball", "Single / Double", "Boundary (4/6)", "Wicket"],
            "poll_type": "next_ball",
            "correct_option_index": None
        }
    elif random.random() < 0.35 and not state.active_poll: # 35% chance on standard events
        trigger_poll = True
        poll_data = {
            "question": f"How many runs will {bowler.name} concede in this over?",
            "options": ["Under 8 runs", "8 to 12 runs", "13+ runs"],
            "poll_type": "over_runs",
            "correct_option_index": None
        }

    explanation = f"Required rate is {req_rate:.2f} runs per over. "
    if state.chase_mode:
        explanation += f"With only {balls_remaining} balls left in 'Chase Mode', every dot ball swings win probability by ~5%. "
    if win_a_pct > 60:
        explanation += f"India holds the upper hand due to set batters, but {bowler.name} holds the key."
    elif win_a_pct < 40:
        explanation += f"Australia is tightening the screws. Boundaries are absolutely required to mount a comeback."
    else:
        explanation += "The game is incredibly balanced, expecting a photo-finish in the final overs."

    return {
        "commentary": selected_comm,
        "trigger_poll": trigger_poll,
        "poll": poll_data,
        "dismissed_player_stat": dismissed_stat,
        "win_probability": {
            "team_a_pct": win_a_pct,
            "team_b_pct": win_b_pct,
            "explanation": explanation
        }
    }

# Actual Gemini Agent Integration
async def run_gemini_agent(event_type: str, state: MatchState) -> Dict[str, Any]:
    global GEMINI_API_KEY
    
    # Format current state for the LLM
    striker = next((b for b in state.batters if b.is_striker), state.batters[0])
    non_striker = next((b for b in state.batters if not b.is_striker), state.batters[1])
    overs = state.get_overs_str()
    runs_needed = state.target - state.runs
    balls_remaining = 120 - state.total_balls
    
    match_context = {
        "batting_team": state.team_a,
        "bowling_team": state.team_b,
        "runs": state.runs,
        "wickets": state.wickets,
        "overs": overs,
        "balls_remaining": balls_remaining,
        "runs_needed": runs_needed,
        "target": state.target,
        "striker": striker.dict(),
        "non_striker": non_striker.dict(),
        "bowler": state.bowler.dict(),
        "last_event_occurred": event_type,
        "chase_mode": state.chase_mode
    }
    
    # Prompt instructing Gemini to act as an autonomous Cricket Live Show Host Agent
    prompt = f"""
    You are an expert AI Cricket Host and Match Analyst Agent running a live second-screen experience for fans during a tense IPL style match (Build with AI - Agentic Premier League).
    Analyze the current match state and the latest ball event:
    {json.dumps(match_context, indent=2)}

    Your task is to return a JSON response containing three things:
    1. A witty, energetic, and highly engaging live commentary or analysis card (1-2 sentences) reacting to the last ball event. Embody the passionate style of legendary cricket announcers, with deep tactical insights.
    2. A dynamic win probability calculation for both teams (values between 5 and 95) and a short professional tactical explanation for why it shifted.
    3. An autonomous decision to trigger a fan poll or prediction question.
       - If the last event was a 'wicket': You MUST trigger a poll (e.g. asking who will anchor, next batsman, etc.) AND generate an interesting player stat card about the dismissed batsman '{striker["name"]}'.
       - If the last event was a 'six': You MUST trigger a poll asking fans to predict what will happen next, or if another six is coming.
       - Otherwise, you can decide whether to trigger a poll based on the context (e.g., target chase, bowler pressure).
       - Keep polls highly creative, contextual, and fun.

    Strictly return ONLY a valid JSON object matching this schema (do not wrap in markdown ```json blocks, just raw JSON text):
    {{
      "commentary": "Exciting commentary line",
      "trigger_poll": true or false,
      "poll": {{
         "question": "Dynamic question based on match events",
         "options": ["Option A", "Option B", "Option C"],
         "poll_type": "wicket_fall" or "next_ball" or "custom_quiz",
         "correct_option_index": null
      }},
      "dismissed_player_stat": "A fun/deep stat card about the dismissed player if a wicket fell, otherwise leave empty.",
      "win_probability": {{
         "team_a_pct": 55,
         "team_b_pct": 45,
         "explanation": "Brief reasoning explaining the shift based on run rate, set batters, or wickets."
      }}
    }}
    """

    # If key is available, run Gemini API call
    key = GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if GEMINI_AVAILABLE and key:
        try:
            # Let's support both google-genai and google-generativeai for safety
            # Option 1: google-genai
            try:
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7
                    )
                )
                result_text = response.text
            except Exception:
                # Option 2: google-generativeai legacy
                genai_legacy.configure(api_key=key)
                model = genai_legacy.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.7}
                )
                result_text = response.text
                
            # Parse the response
            data = json.loads(result_text)
            # Ensure correct format
            if "commentary" in data and "win_probability" in data:
                return data
        except Exception as e:
            print(f"Gemini API Error: {str(e)}. Falling back to local agent.")
            
    # Fallback to local offline agent
    return fallback_cricket_agent(event_type, state)

# Main cricket logic function that advances state
async def advance_match_state(event_type: str):
    """
    Simulates a ball-by-ball event, updates scoreboard, runs AI agent, 
    evaluates active predictions, updates points, and broadcasts via WebSockets.
    """
    global match_state
    
    if not match_state.match_active:
        return
    
    # 0. Evaluate previous active predictions if they exist
    # If the active poll was a 'next_ball' prediction, we evaluate it right now on this ball event!
    eval_poll = match_state.active_poll
    winning_option_idx = None
    
    if eval_poll and eval_poll.get("poll_type") == "next_ball":
        # Options: ["Dot Ball", "Single / Double", "Boundary (4/6)", "Wicket"]
        if event_type == "dot":
            winning_option_idx = 0
        elif event_type in ["single", "double"]:
            winning_option_idx = 1
        elif event_type in ["four", "six"]:
            winning_option_idx = 2
        elif event_type == "wicket":
            winning_option_idx = 3
            
        # Give points to correct guessers
        for username, predicted_idx in list(match_state.active_predictions.items()):
            points_won = 0
            if predicted_idx == winning_option_idx:
                points_won = 20  # correct guess gets 20 pts
            else:
                points_won = 5   # participation gets 5 pts
                
            # Update leaderboard
            for user in match_state.leaderboard:
                if user["username"] == username:
                    user["points"] += points_won
                    break
        
        # Clear predictions
        match_state.active_predictions.clear()

    # 1. Update Match State variables based on event_type
    striker_idx = 0 if match_state.batters[0].is_striker else 1
    striker = match_state.batters[striker_idx]
    non_striker = match_state.batters[1 - striker_idx]
    
    # Reset dismissed stat
    match_state.dismissed_player_stat = ""
    
    # Track ball details
    is_extra = False
    runs_scored = 0
    ball_result_char = ""
    
    if event_type == "dot":
        runs_scored = 0
        ball_result_char = "0"
    elif event_type == "single":
        runs_scored = 1
        ball_result_char = "1"
    elif event_type == "double":
        runs_scored = 2
        ball_result_char = "2"
    elif event_type == "four":
        runs_scored = 4
        ball_result_char = "4"
        striker.fours += 1
    elif event_type == "six":
        runs_scored = 6
        ball_result_char = "6"
        striker.sixes += 1
    elif event_type == "wicket":
        runs_scored = 0
        ball_result_char = "W"
    elif event_type == "wide":
        runs_scored = 1
        ball_result_char = "Wd"
        is_extra = True
    elif event_type == "noball":
        runs_scored = 1
        ball_result_char = "Nb"
        is_extra = True

    # Update runs & wickets
    match_state.runs += runs_scored
    if event_type == "wicket":
        match_state.wickets += 1

    # Update batters & bowler stats
    if not is_extra:
        match_state.total_balls += 1
        striker.runs += runs_scored
        striker.balls += 1
        
        # Update bowler stats
        match_state.bowler.balls_bowled += 1
        match_state.bowler.runs += runs_scored
        if event_type == "wicket":
            match_state.bowler.wickets += 1
        
        # Recalculate bowler overs float
        bowler_overs = match_state.bowler.balls_bowled // 6
        bowler_balls = match_state.bowler.balls_bowled % 6
        match_state.bowler.overs = float(f"{bowler_overs}.{bowler_balls}")

    # Check for wicket falling
    dismissed_player_name = striker.name
    if event_type == "wicket":
        # Bring in a new batter if wickets < 10
        if match_state.wickets < 10:
            used_batters = [b.name for b in match_state.batters]
            available_batters = [p for p in BATTER_POOL if p not in used_batters]
            new_batter_name = random.choice(available_batters) if available_batters else "New Batter"
            
            # Replace the dismissed batsman
            match_state.batters[striker_idx] = BatterState(
                name=new_batter_name,
                runs=0,
                balls=0,
                fours=0,
                sixes=0,
                is_striker=True
            )
            striker = match_state.batters[striker_idx]
        else:
            match_state.match_active = False
            match_state.commentary = "ALL OUT! Australia wins by defending their score."
            await manager.broadcast({
                "type": "MATCH_FINISHED",
                "data": match_state.to_dict()
            })
            return

    # Striker Rotation on odd runs (single, etc.)
    if runs_scored in [1, 3] and not is_extra:
        match_state.batters[striker_idx].is_striker = False
        match_state.batters[1 - striker_idx].is_striker = True
        
    # Append to recent ball list
    match_state.last_balls.append(ball_result_char)
    if len(match_state.last_balls) > 6:
        match_state.last_balls.pop(0)

    # Check if over is completed
    if match_state.total_balls % 6 == 0 and not is_extra and event_type != "wicket":
        # Swap striker
        match_state.batters[0].is_striker = not match_state.batters[0].is_striker
        match_state.batters[1].is_striker = not match_state.batters[1].is_striker
        # New bowler
        current_bowler = match_state.bowler.name
        next_bowlers = [b for b in BOWLER_POOL if b != current_bowler]
        match_state.bowler = BowlerState(
            name=random.choice(next_bowlers),
            overs=0.0,
            runs=0,
            wickets=0,
            balls_bowled=0
        )

    # Check Chase Mode trigger: Last 5 overs (starts after 15.0 overs, total_balls >= 90)
    if match_state.total_balls >= 90:
        match_state.chase_mode = True

    # Check if Target Chase is complete (Win condition)
    if match_state.runs >= match_state.target:
        match_state.match_active = False
        match_state.commentary = "MATCH WON! India pulls off a legendary chase! What a finish!"
        match_state.win_probability_a = 100
        match_state.win_probability_b = 0
        await manager.broadcast({
            "type": "MATCH_FINISHED",
            "data": match_state.to_dict()
        })
        return

    # Check if match ended (20 overs completed)
    if match_state.total_balls >= 120:
        match_state.match_active = False
        if match_state.runs >= match_state.target:
            match_state.commentary = "MATCH WON! India clinches it on the very last ball!"
        else:
            match_state.commentary = "MATCH FINISHED! Australia wins by defending their score."
        await manager.broadcast({
            "type": "MATCH_FINISHED",
            "data": match_state.to_dict()
        })
        return

    # 2. Run the AI Agent to get dynamic commentary, poll, and probability
    # We call our Gemini Agent (with fallback)
    agent_response = await run_gemini_agent(event_type, match_state)
    
    # 3. Update Match State with Agent Decisions
    match_state.commentary = agent_response.get("commentary", match_state.commentary)
    
    # Update probabilities
    prob = agent_response.get("win_probability", {})
    match_state.win_probability_a = prob.get("team_a_pct", match_state.win_probability_a)
    match_state.win_probability_b = prob.get("team_b_pct", match_state.win_probability_b)
    match_state.win_probability_explanation = prob.get("explanation", match_state.win_probability_explanation)
    
    # Handle poll trigger
    if agent_response.get("trigger_poll") and agent_response.get("poll"):
        match_state.active_poll = agent_response["poll"]
        # Set active answer to None
        match_state.active_poll["correct_option_index"] = None
    else:
        # If we didn't trigger a new poll, do we clear the old one?
        # Let's keep a poll active until the next event, but clear it if it was evaluated.
        if eval_poll and eval_poll.get("poll_type") == "next_ball":
            match_state.active_poll = None
            
    # Set stat card
    if event_type == "wicket" and agent_response.get("dismissed_player_stat"):
        match_state.dismissed_player_stat = agent_response.get("dismissed_player_stat")

    # Update Leaderboard rank sorting
    match_state.leaderboard.sort(key=lambda x: x["points"], reverse=True)
    for rank, user in enumerate(match_state.leaderboard, 1):
        user["rank"] = rank

    # 4. Broadcast updated state
    await manager.broadcast({
        "type": "STATE_UPDATE",
        "data": match_state.to_dict()
    })

# Background match simulation loop
async def match_simulation_loop():
    while True:
        await asyncio.sleep(12.0)  # Simulates a ball every 12 seconds
        if match_state.match_active and match_state.auto_simulate:
            events = ["dot", "single", "single", "double", "four", "six", "wicket"]
            # Weighted choice: more singles, dots, and boundaries, fewer wickets
            weights = [25, 35, 10, 12, 10, 8]
            # If the user did select a prediction, make it more fun
            event = random.choices(events[:-1] + ["wicket"], weights=weights)[0]
            await advance_match_state(event)

@app.on_event("startup")
async def startup_event():
    # Start the automatic simulation loop in the background
    asyncio.create_task(match_simulation_loop())

# REST API Endpoints
class PredictionPayload(BaseModel):
    username: str
    option_index: int

class ApiKeyPayload(BaseModel):
    api_key: str

class SimulatePayload(BaseModel):
    event: str  # dot, single, double, four, six, wicket, wide, noball, chase_mode, reset, toggle_auto

@app.get("/api/state")
async def get_state():
    return match_state.to_dict()

@app.post("/api/predict")
async def make_prediction(payload: PredictionPayload):
    if not match_state.active_poll:
        raise HTTPException(status_code=400, detail="No active poll available")
    
    # Store user prediction
    match_state.active_predictions[payload.username] = payload.option_index
    
    # If the poll was a static general poll (not next ball), we can immediately grant points
    if match_state.active_poll.get("poll_type") != "next_ball":
        # Dynamic instant reward for voting
        for user in match_state.leaderboard:
            if user["username"] == payload.username:
                user["points"] += 10
                break
        
        # Sort leaderboard
        match_state.leaderboard.sort(key=lambda x: x["points"], reverse=True)
        for rank, user in enumerate(match_state.leaderboard, 1):
            user["rank"] = rank

        # Broadcast update
        await manager.broadcast({
            "type": "STATE_UPDATE",
            "data": match_state.to_dict()
        })
        
        return {"status": "success", "message": "Vote recorded! You earned 10 points for participating."}
        
    return {"status": "success", "message": "Prediction recorded! Wait for the next delivery to see if you win +20 points!"}

@app.post("/api/config-key")
async def configure_key(payload: ApiKeyPayload):
    global GEMINI_API_KEY
    GEMINI_API_KEY = payload.api_key
    # Test availability
    status = "Configured" if GEMINI_API_KEY else "Cleared"
    return {"status": "success", "message": f"Gemini API key successfully {status}."}

@app.post("/api/simulate")
async def simulate_event(payload: SimulatePayload):
    event = payload.event.lower()
    
    if event == "reset":
        match_state.reset()
        await manager.broadcast({
            "type": "STATE_UPDATE",
            "data": match_state.to_dict()
        })
        return {"status": "success", "message": "Match reset successfully."}
        
    if event == "toggle_auto":
        match_state.auto_simulate = not match_state.auto_simulate
        await manager.broadcast({
            "type": "STATE_UPDATE",
            "data": match_state.to_dict()
        })
        return {"status": "success", "message": f"Auto-simulation set to {match_state.auto_simulate}."}

    if event == "chase_mode":
        match_state.chase_mode = True
        match_state.total_balls = max(90, match_state.total_balls)  # Fast-forward to 15.0 overs
        match_state.commentary = "CHASE MODE ACTIVATED! The last 5 overs begin! Every run is crucial."
        # Update state via agent
        agent_response = await run_gemini_agent("dot", match_state)
        match_state.commentary = agent_response.get("commentary", match_state.commentary)
        prob = agent_response.get("win_probability", {})
        match_state.win_probability_a = prob.get("team_a_pct", match_state.win_probability_a)
        match_state.win_probability_b = prob.get("team_b_pct", match_state.win_probability_b)
        match_state.win_probability_explanation = prob.get("explanation", match_state.win_probability_explanation)
        
        await manager.broadcast({
            "type": "STATE_UPDATE",
            "data": match_state.to_dict()
        })
        return {"status": "success", "message": "Chase mode activated."}

    if event not in ["dot", "single", "double", "four", "six", "wicket", "wide", "noball"]:
        raise HTTPException(status_code=400, detail="Invalid event type")

    if not match_state.match_active:
        raise HTTPException(status_code=400, detail="Match is not active. Reset to simulate events.")

    # Run the cricket event advance
    await advance_match_state(event)
    return {"status": "success", "message": f"Event '{event}' simulated."}

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open by listening for any ping/pong or client messages
            data = await websocket.receive_text()
            # If the client sends a prediction or custom ping via socket, we can handle it
    except WebSocketDisconnect:
        manager.disconnect(websocket)
