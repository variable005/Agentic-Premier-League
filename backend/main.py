import os
import asyncio
import json
import random
import httpx
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Global Keys
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
CRICAPI_KEY = os.environ.get("CRICAPI_KEY", "")

# Initialize GenAI Support
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

app = FastAPI(title="The 12th Man AI Backend", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Player Database for Player Stats Tool
PLAYER_DB = {
    "Virat Kohli": "Virat Kohli: Right-hand batter. 13,848 ODI runs (avg 58.7), 80 centuries. Known as 'The King' and the ultimate chase master under high pressure.",
    "Hardik Pandya": "Hardik Pandya: All-rounder. Right-hand batter / right-arm fast-medium bowler. Strike rate of 142.4 in T20Is, famous for death-over power hitting.",
    "Rishabh Pant": "Rishabh Pant: Wicketkeeper-batter. Left-hand explosive striker. Famous for reverse sweeps and unmatched agility behind the stumps.",
    "Rinku Singh": "Rinku Singh: Left-hand finisher. Average of 89.0 in successful chases with a blistering strike rate of 176.2.",
    "MS Dhoni": "MS Dhoni: Legend Finisher. Former captain, 4.8s stumping reaction time, 10,773 ODI runs. Calmest mind in active cricket history.",
    "Pat Cummins": "Pat Cummins: Right-arm fast bowler. 164 Test wickets, captain of Australia. Expert in off-cutters and high-pressure death overs.",
    "Mitchell Starc": "Mitchell Starc: Left-arm fast bowler. Famous for inswinging yorkers at 150 km/h. Career strike rate of 25.1 in white ball cricket.",
    "Adam Zampa": "Adam Zampa: Right-arm leg-spin bowler. Australia's key wicket-taker in middle overs. 142 ODI wickets, economy rate of 5.4.",
    "Glenn Maxwell": "Glenn Maxwell: 'The Big Show'. Explosive batting all-rounder. Scored 201* in a legendary chase. Right-arm off-break bowler.",
    "Suryakumar Yadav": "Suryakumar Yadav: India's 360-degree T20 specialist. Rank #1 T20 batter with a phenomenal T20I strike rate of 167.5."
}

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

class MatchRoom:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.team_a = "India"
        self.team_b = "Australia"
        self.runs = 138
        self.wickets = 3
        self.total_balls = 84  # 14.0 overs
        self.target = 188     # Target (need 50 runs off 36 balls)
        
        self.batters = [
            BatterState(name="Virat Kohli", runs=54, balls=38, fours=5, sixes=1, is_striker=True),
            BatterState(name="Hardik Pandya", runs=14, balls=10, fours=1, sixes=1, is_striker=False)
        ]
        self.bowler = BowlerState(name="Pat Cummins", overs=2.0, runs=18, wickets=1, balls_bowled=12)
        
        self.last_balls = ["1", "6", "0", "W", "4", "1"]
        self.win_probability_a = 52
        self.win_probability_b = 48
        self.win_probability_explanation = "India needs 50 runs off 36 balls. Virat Kohli is anchoring the chase beautifully, but Cummins is bowling tight."
        self.commentary = "Welcome to your active Match Room! Let the AI Match Agent drive your Second Screen."
        self.active_poll: Optional[Dict[str, Any]] = None
        self.chase_mode = False
        self.match_active = True
        self.dismissed_player_stat = ""
        
        self.leaderboard = [
            {"username": "Agent Dhoni", "points": 140, "rank": 1},
            {"username": "Gemini Guru", "points": 110, "rank": 2},
            {"username": "FastAPI Fan", "points": 80, "rank": 3}
        ]
        self.predictions = {}  # username -> prediction_index

    def get_overs_str(self) -> float:
        overs = self.total_balls // 6
        balls = self.total_balls % 6
        return float(f"{overs}.{balls}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "room_code": self.room_code,
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
            "dismissed_player_stat": self.dismissed_player_stat,
            "leaderboard": sorted(self.leaderboard, key=lambda x: x["points"], reverse=True)
        }

# Multi-Room Database Store (In-Memory but structured with Firestore schemas)
ROOMS: Dict[str, MatchRoom] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_code: str, websocket: WebSocket):
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
        self.active_connections[room_code].append(websocket)
        
        # Send initial room state
        room = ROOMS.get(room_code)
        if room:
            await websocket.send_text(json.dumps({
                "type": "INIT_STATE",
                "data": room.to_dict()
            }))

    def disconnect(self, room_code: str, websocket: WebSocket):
        if room_code in self.active_connections:
            if websocket in self.active_connections[room_code]:
                self.active_connections[room_code].remove(websocket)

    async def broadcast(self, room_code: str, message: Dict[str, Any]):
        if room_code in self.active_connections:
            for connection in self.active_connections[room_code]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

ws_manager = ConnectionManager()

# --- THE 12TH MAN MATCHAGENT TOOLS (Google ADK Style) ---

def fetch_match_data(room_code: str) -> Dict[str, Any]:
    """Tool 1: Calls CricAPI to fetch latest scoreboard, or polls room state if offline."""
    room = ROOMS.get(room_code)
    if not room:
        return {"error": "Room not found"}
    return {
        "runs": room.runs,
        "wickets": room.wickets,
        "overs": room.get_overs_str(),
        "striker": next((b.name for b in room.batters if b.is_striker), "Unknown"),
        "bowler": room.bowler.name
    }

def fetch_player_stats(player_name: str) -> str:
    """Tool 2: Gets career metrics for a player from the local DB/CricAPI."""
    return PLAYER_DB.get(player_name, f"Profile for {player_name}: Excellent national level T20 league specialist.")

def trigger_fan_poll(room_code: str, question: str, options: List[str], poll_type: str = "next_ball") -> Dict[str, Any]:
    """Tool 3: Pushes an automated prediction challenge to the room's users."""
    room = ROOMS.get(room_code)
    if room:
        room.active_poll = {
            "question": question,
            "options": options,
            "poll_type": poll_type,
            "correct_option_index": None
        }
        room.predictions = {}
        return {"status": "success", "question": question}
    return {"error": "Room not found"}

def generate_insight(room_code: str, context: str) -> str:
    """Tool 4: Invokes Gemini to compose a high-adrenaline second-screen commentary insight."""
    room = ROOMS.get(room_code)
    if not room:
        return "Match is boiling to a thrilling finish!"
        
    global GEMINI_API_KEY
    key = GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    
    prompt = f"""
    Context: {context}
    Match State: {room.runs}/{room.wickets} in {room.get_overs_str()} overs. Target: {room.target}.
    Write a short, thrilling, witty commentary snippet (1-2 sentences) about the match. Be high-adrenaline like a stadium commentator.
    """
    
    if GEMINI_AVAILABLE and key:
        try:
            try:
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model='gemini-1.5-flash',
                    contents=prompt
                )
                return response.text.strip()
            except Exception:
                genai_legacy.configure(api_key=key)
                model = genai_legacy.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                return response.text.strip()
        except Exception:
            pass
            
    # Offline fallbacks
    fallbacks = [
        "Unbelievable scenes! The stadium has completely erupted!",
        "Every ball is now a story. The bowler looks tense, the batter is ready.",
        "Precision placement! That keeps the required run rate in absolute check."
    ]
    return random.choice(fallbacks)

def update_leaderboard(room_code: str, winning_option_idx: int) -> List[Dict[str, Any]]:
    """Tool 5: Evaluates fan predictions, adds points (+100 for correct), and syncs Firestore."""
    room = ROOMS.get(room_code)
    if not room:
        return []
        
    for user_pred in room.predictions.items():
        user, opt_idx = user_pred
        if opt_idx == winning_option_idx:
            # Correct answer! +100 points
            for player in room.leaderboard:
                if player["username"].lower() == user.lower():
                    player["points"] += 100
                    break
                    
    # Re-rank
    room.leaderboard = sorted(room.leaderboard, key=lambda x: x["points"], reverse=True)
    for idx, player in enumerate(room.leaderboard):
        player["rank"] = idx + 1
        
    return room.leaderboard


# --- MATCHAGENT AUTONOMOUS BRAIN (Gemini 1.5 Flash Call Loop) ---

async def run_match_agent(room_code: str, event_type: str) -> Dict[str, Any]:
    """
    The Match Agent brain. It is fed with live data and decides which tools to invoke
    based on the event (Wicket, Six, Death Overs, etc.).
    """
    room = ROOMS.get(room_code)
    if not room:
        return {"error": "Room not found"}
        
    striker = next((b for b in room.batters if b.is_striker), room.batters[0])
    non_striker = next((b for b in room.batters if not b.is_striker), room.batters[1])
    runs_needed = room.target - room.runs
    balls_remaining = 120 - room.total_balls
    
    # 1. Autonomous Decisions based on Match Rules
    commentary_txt = ""
    dismissed_stat = ""
    win_a = 50
    win_b = 50
    explanation = ""
    
    # Event reactions
    if event_type == "wicket":
        # Tool call: fetch player stats
        dismissed_stat = fetch_player_stats(striker.name)
        # Tool call: generate insight
        commentary_txt = generate_insight(room_code, f"Wicket falls! {striker.name} is dismissed by {room.bowler.name}.")
        # Tool call: trigger fan poll
        trigger_fan_poll(
            room_code=room_code,
            question=f"Wicket falls! With {striker.name} out, who will anchor the crease?",
            options=[f"{non_striker.name}", "New Batter", "Collapse incoming!"],
            poll_type="wicket"
        )
        win_a = max(10, room.win_probability_a - 15)
        explanation = f"Massive blow! The dismissal of {striker.name} swings the odds heavily towards Australia."
        
    elif event_type == "six":
        # Tool call: generate insight
        commentary_txt = generate_insight(room_code, f"💥 SIX! {striker.name} hammers {room.bowler.name} out of the ground.")
        # Tool call: trigger fan poll
        trigger_fan_poll(
            room_code=room_code,
            question=f"Predict {striker.name}'s next ball after that massive 6!",
            options=["Another Boundary", "Single / Double", "Dot Ball", "Wicket!"],
            poll_type="next_ball"
        )
        win_a = min(90, room.win_probability_a + 8)
        explanation = f"Pure momentum! That six puts immense bowling pressure on {room.bowler.name}."
        
    elif event_type == "death_overs":
        room.chase_mode = True
        commentary_txt = "🔥 Death Over Mode Activated! Win probability metrics are shifting live. Stay locked in!"
        trigger_fan_poll(
            room_code=room_code,
            question="Death overs start! How many runs will India score in this over?",
            options=["Under 8 runs", "8 to 12 runs", "13+ runs"],
            poll_type="over_runs"
        )
        win_a = room.win_probability_a
        explanation = "We are down to the wire. The field is spread and tension is maximum."
        
    elif event_type == "win":
        commentary_txt = f"🏆 MATCH FINISHED! India pulls off a legendary chase to defeat Australia! The 12th Man celebrates!"
        trigger_fan_poll(
            room_code=room_code,
            question="Match concluded! Who is your Player of the Match?",
            options=["Virat Kohli (54)", "Hardik Pandya (34*)", "Pat Cummins (2/28)"],
            poll_type="summary"
        )
        win_a = 100
        explanation = "India successfully chased down the target of 188! What a match!"
        
    else: # normal dot/single/double/four
        commentary_txt = generate_insight(room_code, f"Normal delivery: {event_type} conceded.")
        # 30% chance for random over polls
        if random.random() < 0.3 and not room.active_poll:
            trigger_fan_poll(
                room_code=room_code,
                question="Will the next delivery be a boundary?",
                options=["Yes, fully expecting it", "No, bowler keeps it tight"],
                poll_type="next_ball"
            )
        win_a = room.win_probability_a
        if event_type == "four":
            win_a = min(95, win_a + 4)
        elif event_type == "dot":
            win_a = max(5, win_a - 3)
        explanation = f"Chasing rate is at {(runs_needed / (balls_remaining/6 or 1)):.2f} RPO."

    # Update states
    room.win_probability_a = win_a
    room.win_probability_b = 100 - win_a
    room.win_probability_explanation = explanation
    room.commentary = commentary_txt
    room.dismissed_player_stat = dismissed_stat
    
    return room.to_dict()


# --- HTTP ENDPOINTS ---

@app.post("/api/create-room")
async def create_room():
    """Generates a unique 4-digit room code Kahoot-style and sets initial match state."""
    code = str(random.randint(1000, 9999))
    while code in ROOMS:
        code = str(random.randint(1000, 9999))
        
    ROOMS[code] = MatchRoom(room_code=code)
    return {"status": "success", "room_code": code}

@app.post("/api/join-room")
async def join_room(payload: Dict[str, str]):
    """Adds a fan to the room leaderboard."""
    room_code = payload.get("room_code")
    username = payload.get("username", "Fan").strip()
    
    if not room_code or room_code not in ROOMS:
        raise HTTPException(status_code=404, detail="Room code not found.")
        
    room = ROOMS[room_code]
    
    # Check if already joined
    exists = any(u["username"].lower() == username.lower() for u in room.leaderboard)
    if not exists and username:
        room.leaderboard.append({
            "username": username,
            "points": 0,
            "rank": len(room.leaderboard) + 1
        })
        
    return {"status": "success", "data": room.to_dict()}

@app.get("/api/get-match-state")
async def get_match_state(room_code: str):
    """Fetches full score, insight, and active prediction state."""
    if room_code not in ROOMS:
        raise HTTPException(status_code=404, detail="Room not found")
    return ROOMS[room_code].to_dict()

@app.post("/api/submit-prediction")
async def submit_prediction(payload: Dict[str, Any]):
    """Accepts user vote on current active poll."""
    room_code = payload.get("room_code")
    username = payload.get("username")
    option_idx = payload.get("option_index")
    
    if not room_code or room_code not in ROOMS:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = ROOMS[room_code]
    if not room.active_poll:
        raise HTTPException(status_code=400, detail="No active poll running in this room.")
        
    room.predictions[username] = option_idx
    return {"status": "success", "message": f"Prediction recorded for option index {option_idx}!"}

@app.post("/api/simulate-event")
async def simulate_event(payload: Dict[str, Any]):
    """Hidden demo controller. Advances match score, calls MatchAgent, evaluates predictions."""
    room_code = payload.get("room_code")
    event = payload.get("event") # 'wicket', 'six', 'four', 'dot', 'death_overs', 'win'
    
    if not room_code or room_code not in ROOMS:
        raise HTTPException(status_code=404, detail="Room not found")
        
    room = ROOMS[room_code]
    if not room.match_active:
        return {"status": "match_finished", "message": "Match already concluded."}
        
    # 0. Evaluate active predictions BEFORE changing state
    # e.g. If last poll was next_ball, correct is index 0 for six, 2 for dot, 3 for wicket
    if room.active_poll and room.active_poll.get("poll_type") == "next_ball":
        correct_idx = None
        if event == "six" or event == "four":
            correct_idx = 0 # Boundary
        elif event == "dot":
            correct_idx = 2 # Dot Ball
        elif event == "wicket":
            correct_idx = 3 # Wicket
        else:
            correct_idx = 1 # Single/Double
            
        if correct_idx is not None:
            update_leaderboard(room_code, correct_idx)
            
    # 1. Advance scorecard stats
    room.total_balls += 1
    striker = next((b for b in room.batters if b.is_striker), room.batters[0])
    bowler = room.bowler
    
    bowler.balls_bowled += 1
    bowler.overs = round((bowler.balls_bowled // 6) + (bowler.balls_bowled % 6)/10.0, 1)
    
    if event == "six":
        room.runs += 6
        striker.runs += 6
        striker.sixes += 1
        striker.balls += 1
        bowler.runs += 6
        room.last_balls.append("6")
    elif event == "four":
        room.runs += 4
        striker.runs += 4
        striker.fours += 1
        striker.balls += 1
        bowler.runs += 4
        room.last_balls.append("4")
    elif event == "dot":
        striker.balls += 1
        room.last_balls.append("0")
    elif event == "wicket":
        room.wickets += 1
        striker.balls += 1
        bowler.wickets += 1
        room.last_balls.append("W")
        # swap batter out
        if room.wickets < 10:
            new_batters = ["Rishabh Pant", "Rinku Singh", "MS Dhoni", "Suryakumar Yadav"]
            # get name not already batting
            active_names = [b.name for b in room.batters]
            available = [n for n in new_batters if n not in active_names]
            new_name = available[0] if available else "Tailender"
            
            # replace striker
            for idx, b in enumerate(room.batters):
                if b.is_striker:
                    room.batters[idx] = BatterState(name=new_name, runs=0, balls=0, fours=0, sixes=0, is_striker=True)
                    break
    elif event == "win":
        room.runs = room.target
        striker.runs += 12
        room.last_balls.append("4")
        room.match_active = False
    elif event == "death_overs":
        room.total_balls = 90 # Start of over 15
        bowler.balls_bowled = 18
        bowler.overs = 3.0
        
    if len(room.last_balls) > 6:
        room.last_balls.pop(0)

    # 2. Trigger MatchAgent Brain
    updated_state = await run_match_agent(room_code, event)
    
    # 3. Broadcast to all fans real-time
    await ws_manager.broadcast(room_code, {
        "type": "STATE_UPDATE",
        "data": updated_state
    })
    
    return {"status": "success", "message": f"Event '{event}' simulated, MatchAgent completed tool execution."}

@app.post("/api/config-keys")
async def config_keys(payload: Dict[str, str]):
    """Dynamic credentials injector from setting drawer."""
    global GEMINI_API_KEY, CRICAPI_KEY
    g_key = payload.get("gemini_key")
    c_key = payload.get("cric_key")
    if g_key is not None:
        GEMINI_API_KEY = g_key
    if c_key is not None:
        CRICAPI_KEY = c_key
    return {"status": "success"}


# --- WEBSOCKETS ---

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await ws_manager.connect(room_code, websocket)
    try:
        while True:
            # Maintain active connection
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(room_code, websocket)
