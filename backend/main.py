import json
import random
import requests
from fastapi import FastAPI, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

app = FastAPI(title="The 12th Man - AI Cricket Experience")

# Enable CORS for Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Melbourne 2022 T20 World Cup Dataset ---
MELBOURNE_DATASET = [
    {
        "ball_id": 0,
        "overs": 17.0,
        "runs": 112,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "India needs 48 runs in 18 balls!",
        "score_text": "IND: 112/4 (17.0 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 46, "balls": 34, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 32, "balls": 29, "is_strike": False}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.0, "wickets": 1, "runs": 22},
        "recent_ball": "Start"
    },
    {
        "ball_id": 1,
        "overs": 17.1,
        "runs": 114,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Afridi to Kohli: 2 runs taken!",
        "score_text": "IND: 114/4 (17.1 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 48, "balls": 35, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 32, "balls": 29, "is_strike": False}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.1, "wickets": 1, "runs": 24},
        "recent_ball": "2"
    },
    {
        "ball_id": 2,
        "overs": 17.2,
        "runs": 115,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Afridi to Kohli: 1 run down to long-on.",
        "score_text": "IND: 115/4 (17.2 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 49, "balls": 36, "is_strike": False},
            {"name": "Hardik Pandya", "runs": 32, "balls": 29, "is_strike": True}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.2, "wickets": 1, "runs": 25},
        "recent_ball": "1"
    },
    {
        "ball_id": 3,
        "overs": 17.3,
        "runs": 116,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Afridi to Pandya: 1 run, strike rotated.",
        "score_text": "IND: 116/4 (17.3 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 49, "balls": 36, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 33, "balls": 30, "is_strike": False}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.3, "wickets": 1, "runs": 26},
        "recent_ball": "1"
    },
    {
        "ball_id": 4,
        "overs": 17.4,
        "runs": 120,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "FOUR! Kohli flicks Afridi past short fine leg!",
        "score_text": "IND: 120/4 (17.4 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 53, "balls": 37, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 33, "balls": 30, "is_strike": False}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.4, "wickets": 1, "runs": 30},
        "recent_ball": "4"
    },
    {
        "ball_id": 5,
        "overs": 17.5,
        "runs": 124,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "FOUR MORE! Kohli drives Afridi through covers!",
        "score_text": "IND: 124/4 (17.5 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 57, "balls": 38, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 33, "balls": 30, "is_strike": False}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 3.5, "wickets": 1, "runs": 34},
        "recent_ball": "4"
    },
    {
        "ball_id": 6,
        "overs": 18.0,
        "runs": 126,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Kohli gets 2. India needs 31 runs in 12 balls!",
        "score_text": "IND: 126/4 (18.0 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 59, "balls": 39, "is_strike": False},
            {"name": "Hardik Pandya", "runs": 33, "balls": 30, "is_strike": True}
        ],
        "bowler": {"name": "Shaheen Afridi", "overs": 4.0, "wickets": 1, "runs": 36},
        "recent_ball": "2"
    },
    {
        "ball_id": 7,
        "overs": 18.1,
        "runs": 127,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Rauf to Pandya: 1 run. Kohli on strike.",
        "score_text": "IND: 127/4 (18.1 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 59, "balls": 39, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 34, "balls": 31, "is_strike": False}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 3.1, "wickets": 0, "runs": 15},
        "recent_ball": "1"
    },
    {
        "ball_id": 8,
        "overs": 18.2,
        "runs": 128,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Rauf to Kohli: 1 run. Strike rotated.",
        "score_text": "IND: 128/4 (18.2 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 60, "balls": 40, "is_strike": False},
            {"name": "Hardik Pandya", "runs": 34, "balls": 31, "is_strike": True}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 3.2, "wickets": 0, "runs": 16},
        "recent_ball": "1"
    },
    {
        "ball_id": 9,
        "overs": 18.3,
        "runs": 128,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "DOT BALL! Haris Rauf bowls a searing bouncer to Hardik.",
        "score_text": "IND: 128/4 (18.3 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 60, "balls": 40, "is_strike": False},
            {"name": "Hardik Pandya", "runs": 34, "balls": 32, "is_strike": True}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 3.3, "wickets": 0, "runs": 16},
        "recent_ball": "0"
    },
    {
        "ball_id": 10,
        "overs": 18.4,
        "runs": 129,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Rauf to Pandya: 1 run. India needs 28 off 8 balls!",
        "score_text": "IND: 129/4 (18.4 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 60, "balls": 40, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 35, "balls": 33, "is_strike": False}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 3.4, "wickets": 0, "runs": 17},
        "recent_ball": "1"
    },
    {
        "ball_id": 11,
        "overs": 18.5,
        "runs": 135,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "🚀 SIX! THE ICONIC STRAIGHT DRIVE SIX OVER RAUF'S HEAD!",
        "score_text": "IND: 135/4 (18.5 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 66, "balls": 41, "is_strike": True},
            {"name": "Hardik Pandya", "runs": 35, "balls": 33, "is_strike": False}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 3.5, "wickets": 0, "runs": 23},
        "recent_ball": "6"
    },
    {
        "ball_id": 12,
        "overs": 19.0,
        "runs": 141,
        "wickets": 4,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "🚀 SIX MORE! Kohli flicks Haris Rauf over fine leg! 16 off 6 remain!",
        "score_text": "IND: 141/4 (19.0 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 72, "balls": 42, "is_strike": False},
            {"name": "Hardik Pandya", "runs": 35, "balls": 33, "is_strike": True}
        ],
        "bowler": {"name": "Haris Rauf", "overs": 4.0, "wickets": 0, "runs": 29},
        "recent_ball": "6"
    },
    {
        "ball_id": 13,
        "overs": 19.1,
        "runs": 141,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "🔴 WICKET! Nawaz gets Hardik caught at short mid-wicket!",
        "score_text": "IND: 141/5 (19.1 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 72, "balls": 42, "is_strike": False},
            {"name": "Dinesh Karthik", "runs": 0, "balls": 0, "is_strike": True}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.1, "wickets": 1, "runs": 28},
        "recent_ball": "W"
    },
    {
        "ball_id": 14,
        "overs": 19.2,
        "runs": 142,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Nawaz to Karthik: 1 run. Kohli back on strike! 15 off 4.",
        "score_text": "IND: 142/5 (19.2 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 72, "balls": 42, "is_strike": True},
            {"name": "Dinesh Karthik", "runs": 1, "balls": 1, "is_strike": False}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.2, "wickets": 1, "runs": 29},
        "recent_ball": "1"
    },
    {
        "ball_id": 15,
        "overs": 19.3,
        "runs": 144,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Kohli gets 2 runs on a long strike double. 13 off 3 balls.",
        "score_text": "IND: 144/5 (19.3 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 74, "balls": 43, "is_strike": True},
            {"name": "Dinesh Karthik", "runs": 1, "balls": 1, "is_strike": False}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.3, "wickets": 1, "runs": 31},
        "recent_ball": "2"
    },
    {
        "ball_id": 16,
        "overs": 19.4,
        "runs": 150,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "🚀 SIX! NO-BALL HIGH FULL TOSS SMASHED BY KOHLI!",
        "score_text": "IND: 150/5 (19.4 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 80, "balls": 44, "is_strike": True},
            {"name": "Dinesh Karthik", "runs": 1, "balls": 1, "is_strike": False}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.4, "wickets": 1, "runs": 37},
        "recent_ball": "6 (NB)"
    },
    {
        "ball_id": 17,
        "overs": 19.4,
        "runs": 151,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "Nawaz bowls a WIDE! (Free hit continues) 5 off 3 balls.",
        "score_text": "IND: 151/5 (19.4 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 80, "balls": 44, "is_strike": True},
            {"name": "Dinesh Karthik", "runs": 1, "balls": 1, "is_strike": False}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.4, "wickets": 1, "runs": 38},
        "recent_ball": "Wd"
    },
    {
        "ball_id": 18,
        "overs": 19.4,
        "runs": 154,
        "wickets": 5,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "3 BYE RUNS! Kohli bowled on free hit, runs down to third man!",
        "score_text": "IND: 154/5 (19.4 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 80, "balls": 44, "is_strike": False},
            {"name": "Dinesh Karthik", "runs": 1, "balls": 1, "is_strike": True}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.4, "wickets": 1, "runs": 41},
        "recent_ball": "3 B"
    },
    {
        "ball_id": 19,
        "overs": 19.5,
        "runs": 154,
        "wickets": 6,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "🔴 DK STUMPED! Dinesh Karthik out, Ashwin walks out! 2 off 1.",
        "score_text": "IND: 154/6 (19.5 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 80, "balls": 44, "is_strike": False},
            {"name": "Ravichandran Ashwin", "runs": 0, "balls": 0, "is_strike": True}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.5, "wickets": 2, "runs": 41},
        "recent_ball": "W"
    },
    {
        "ball_id": 20,
        "overs": 19.5,
        "runs": 155,
        "wickets": 6,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "WIDE! Ashwin calmly leaves it down leg side! 1 off 1.",
        "score_text": "IND: 155/6 (19.5 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 80, "balls": 44, "is_strike": False},
            {"name": "Ravichandran Ashwin", "runs": 0, "balls": 0, "is_strike": True}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 3.5, "wickets": 2, "runs": 42},
        "recent_ball": "Wd"
    },
    {
        "ball_id": 21,
        "overs": 20.0,
        "runs": 156,
        "wickets": 6,
        "team_1": "India",
        "team_2": "Pakistan",
        "batting_team": "India",
        "name": "T20 World Cup 2022 - Melbourne Replay",
        "status": "INDIA WINS! Ashwin chips it over mid-off for the winning run! Kohli: 82*(53)!",
        "score_text": "IND: 156/6 (20.0 overs)",
        "batsmen": [
            {"name": "Virat Kohli", "runs": 82, "balls": 53, "is_strike": False},
            {"name": "Ravichandran Ashwin", "runs": 1, "balls": 1, "is_strike": True}
        ],
        "bowler": {"name": "Mohammad Nawaz", "overs": 4.0, "wickets": 2, "runs": 43},
        "recent_ball": "1"
    }
]

# --- In-Memory State ---
mock_match = {
    "match_id": "hackathon-12th-man-match",
    "name": "India vs Australia (Live Field)",
    "status": "In progress",
    "team_1": "India",
    "team_2": "Australia",
    "batting_team": "India",
    "runs": 142,
    "wickets": 3,
    "overs": 15.1,
    "score_text": "IND: 142/3 (15.1 overs)",
    "batsmen": [
        {"name": "Virat Kohli", "runs": 58, "balls": 36, "is_strike": True},
        {"name": "Hardik Pandya", "runs": 12, "balls": 8, "is_strike": False}
    ],
    "bowler": {"name": "Pat Cummins", "overs": 2.1, "wickets": 1, "runs": 18},
    "recent_ball": "1"
}

# --- Multi-Feature AI Event State (Expanded to 24 Features) ---
active_event = {
    "event_type": "welcome",
    "insight": "Welcome to The 12th Man! Configure your keys and run replays or simulations to experience captains press quotes, batsman milestones, parallel universe comparisons, and pre-cog future predictions.",
    "coach_review": "Kohli should hold anchor. Pandya has the capability to hit big but strike rotation must keep Australia's seamers moving.",
    "win_prob_explainer": "India has Kohli in deep set, giving them a 58% control, but Cummins' cutters are creating heavy off-stump pressure.",
    "crowd_chant": "Go Virat! King of Melbourne! 🇮🇳🏏",
    "emoji_reel": "🏏👑🏟️🙌🇮🇳🏆🔥",
    "headline": "THE 12TH MAN STADIUM INTERFACE EXPANDED: 24 AI CORE STADIUM PLUGINS ACTIVATED!",
    "quiz_question": "Who scored the winning runs in India's iconic Melbourne 2022 World Cup chase?",
    "quiz_options": ["Virat Kohli", "Ravichandran Ashwin"],
    "quiz_answer_idx": 1,
    "poll_question": "Will Virat Kohli score a boundary in the next 3 deliveries?",
    "poll_options": ["Yes, King is ready!", "No, defender mode on"],
    "fan_sentiment": "82% Tension",
    "press_quote": "Captain Rohit Sharma: 'When Kohli is in, we have complete trust. We knew we had to keep it deep. This will go down in history.'",
    "bowler_threat": "Pat Cummins: Very High Threat. Cross-seam bounce is hitting the deck hard.",
    "milestone_prediction": "Virat Kohli: 92% Chance of 50. Batting looks highly solid under stadium lights.",
    "momentum_diff": "India 65% | Australia 35% (India currently dominating off-side corridors)",
    
    # 10 More Features!
    "director_cut": "Camera Director: Cut to close-up of Kohli's eyes, wide and focused under helmet. Next, slow-pan to Pakistani captain rearranging deep mid-wicket fields.",
    "super_over": "Super Over Calculation: India: 18/1 (Kohli 12*, Hardik 6, Bowler: Afridi) | Pakistan: 14/2 (Babar 8, Rizwan 4, Bowler: Bumrah). Projected Winner: India!",
    "field_placement": "Field Alignment: Sweeper Cover is pushed back to boundary, Mid-on is up in the circle. Bowler is angling into ribs to choke Kohli.",
    "parallel_dimension": "Parallel Dimension: This ball mirrors Sachin Tendulkar's legendary straight drive in Sharjah 1998 off Michael Kasprowicz!",
    "weather_micro": "Micro-climate Projection: Damp sea breeze coming over Melbourne is making ball swing 0.8 degrees extra. Seamers get slight edge.",
    "parody_ad": "🔥 SPONSOR SHOUT-OUT: This massive hit brought to you by 'King Kohli's Windshield Shield' - Protect your stadium glass windows from high-altitude leather! 😂",
    "decibel_cheer": "114 dB - Jet Engine roar! Melbourne stadium crowd is vibrating at historic seismic levels!",
    "precog_script": "Pre-cog Script: Next ball: Single to long-on. 2nd ball: Hardik plays a sweep for two. 3rd ball: Dot ball outside off-stump.",
    "glossary_jargon": "Free-hit: A rare tactical luxury. Wickets (except run-outs) do not result in dismissal, allowing batsmen to strike with 100% force.",
    "hindi_trans": "भारत को १८ गेंदों में ४८ रनों की दरकार है। कोहली क्रीज़ पर पूरी एकाग्रता के साथ टिके हुए हैं। रोमांच चरम सीमा पर है!",
    
    "votes": {"option_0": 14, "option_1": 6}
}

available_batsmen = ["Ravindra Jadeja", "Axar Patel", "KL Rahul", "Suryakumar Yadav", "Rinku Singh"]
current_batsman_index = 0

# --- Pydantic Models ---
class EventRequest(BaseModel):
    event: str
    score_text: str
    persona: str = "Harsha Bhogle"

class PredictRequest(BaseModel):
    option_index: int

class WhatIfRequest(BaseModel):
    query: str
    score_text: str

class SetBallRequest(BaseModel):
    ball_id: int
    persona: str = "Harsha Bhogle"

class TranslateRequest(BaseModel):
    text: str
    lang: str

# --- Gemini API Call ---
def call_gemini_multifeature(event: str, score_text: str, persona: str, api_key: str) -> dict:
    """Calls Gemini 1.5 Flash to extract 24 unique, innovative AI-driven features in a single call."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = (
        f"You are the ultimate Gemini-powered AI Cricket Core running for 'The 12th Man' premium application.\n"
        f"A match event just occurred: '{event.upper()}'.\n"
        f"The current match scoreboard reads: '{score_text}'.\n"
        f"The user selected Commentator Persona is: '{persona}'.\n\n"
        f"Compose 24 unique, innovative AI features for this moment:\n"
        f"1. 'insight': Commentary in character of the selected persona (Harsha Bhogle = poetic, witty; Ravi Shastri = high-energy, thunderous; Geoff Boycott = critical, grumpy). Exactly 2 punchy, dramatic sentences.\n"
        f"2. 'coach_review': Practical, high-level tactical coaching advice for the batting side. 1 clear sentence.\n"
        f"3. 'win_prob_explainer': Strategic reasoning explaining *why* the winning odds shifting in this moment. 1 sentence.\n"
        f"4. 'crowd_chant': A catchy, rhythmic stadium chant or slogan for the fans (e.g. 'Kohli, Kohli, King of Melbourne!').\n"
        f"5. 'emoji_reel': A sequence of exactly 8-12 expressive emojis translating this moment.\n"
        f"6. 'headline': A catchy newspaper headline for this ball event.\n"
        f"7. 'quiz_question': A cricket trivia or historical quiz question inspired by this matchup (India vs Pakistan or India vs Australia) or current batsman.\n"
        f"8. 'quiz_options': Exactly 2 catchy choices for the trivia quiz.\n"
        f"9. 'quiz_answer_idx': The 0-indexed integer of the correct quiz option.\n"
        f"10. 'poll_question': An exciting fan prediction poll question about what will happen next.\n"
        f"11. 'poll_options': Exactly 2 options for the poll.\n"
        f"12. 'fan_sentiment': A dynamic stress or excitement indicator (e.g. '94% Tension', '88% Hype', '75% Focus').\n"
        f"13. 'press_quote': A dynamic captain press conference quote commenting on this ball (e.g., 'Captain Rohit Sharma: ...').\n"
        f"14. 'bowler_threat': A dynamic threat matrix assessment of the active bowler.\n"
        f"15. 'milestone_prediction': AI milestone projection for the current batsman on strike.\n"
        f"16. 'momentum_diff': Dynamic momentum split between batting and bowling sides in percentage (e.g., 'India 72% | Pakistan 28%').\n"
        
        # 10 More Features!
        f"17. 'director_cut': Witty director notes detailing what the television cameras should focus on (e.g. close-ups, crowd expressions).\n"
        f"18. 'super_over': A simulation prediction projection if the match ties and goes to a super over.\n"
        f"19. 'field_placement': AI description of current field alignment gaps.\n"
        f"20. 'parallel_dimension': Historical cricket match ball comparison (e.g. 'This matches Sachin's hook in 2003...').\n"
        f"21. 'weather_micro': Weather pitch dampness micro-climate analysis.\n"
        f"22. 'parody_ad': Hilarious mock stadium commercial parody based on the player/action.\n"
        f"23. 'decibel_cheer': estimated crowd cheer decibel level with a witty description (e.g. '112 dB - jet engine roar!').\n"
        f"24. 'precog_script': Pre-cog script predicting the exact trajectory/runs of the next 3 balls.\n"
        f"25. 'glossary_jargon': Engaging explanation of one cricket technical term in this play (e.g. Yorker, Bye, Stumped).\n"
        f"26. 'hindi_trans': A beautiful translation of the commentator 'insight' into pure high-energy Hindi translation text.\n"
        f"27. 'micro_details_missed': Things the broadcast missed (e.g., 'Batsman subtly changed grip before release').\n"
        f"28. 'player_card_batsman': A quick advanced stat card for the batsman on strike (e.g., 'SR 138 vs spin, weak zone: outside off').\n"
        f"29. 'player_card_bowler': A quick advanced stat card for the current bowler (e.g., 'Econ 7.2, 40% deliveries are arm balls').\n"
        f"30. 'pitch_map_zone': Exact prediction of where the ball pitched and line (e.g., 'Good length, middle and leg').\n"
        f"31. 'bat_speed_estimate': Estimated bat swing speed and intent (e.g., '142 km/h swing speed, showing hyper-aggression').\n"
        f"32. 'footwork_analysis': Analysis of the batsman's footwork (e.g., 'Deep in the crease, using depth to negotiate bounce').\n"
        f"33. 'historical_stat': A hyper-relevant historical statistical fact for this exact match situation.\n"
        f"34. 'partnership_context': How this ball/partnership mathematically impacts the overall chase mechanics.\n"
        f"35. 'weakness_exploited': What precise weakness the bowler or batsman just exploited in the opposition.\n"
        f"36. 'next_tactical_move': The most logical next tactical change the fielding captain MUST make now.\n\n"
        
        f"Return ONLY a valid JSON object matching this schema. Do not return any other text, no markdown wrappers:\n"
        f"{{\n"
        f"  \"insight\": \"commentary\",\n"
        f"  \"coach_review\": \"advice\",\n"
        f"  \"win_prob_explainer\": \"prob explainer\",\n"
        f"  \"crowd_chant\": \"chant\",\n"
        f"  \"emoji_reel\": \"emojis\",\n"
        f"  \"headline\": \"headline\",\n"
        f"  \"quiz_question\": \"trivia question\",\n"
        f"  \"quiz_options\": [\"Option 1\", \"Option 2\"],\n"
        f"  \"quiz_answer_idx\": 0,\n"
        f"  \"poll_question\": \"poll question\",\n"
        f"  \"poll_options\": [\"Option 1\", \"Option 2\"],\n"
        f"  \"fan_sentiment\": \"sentiment\",\n"
        f"  \"press_quote\": \"quote\",\n"
        f"  \"bowler_threat\": \"threat\",\n"
        f"  \"milestone_prediction\": \"milestones\",\n"
        f"  \"momentum_diff\": \"momentum\",\n"
        f"  \"director_cut\": \"notes\",\n"
        f"  \"super_over\": \"superover score\",\n"
        f"  \"field_placement\": \"field gaps\",\n"
        f"  \"parallel_dimension\": \"comparison\",\n"
        f"  \"weather_micro\": \"micro-climate\",\n"
        f"  \"parody_ad\": \"advertisement shout\",\n"
        f"  \"decibel_cheer\": \"decibels explanation\",\n"
        f"  \"precog_script\": \"precog notes\",\n"
        f"  \"glossary_jargon\": \"jargon definition\",\n"
        f"  \"hindi_trans\": \"hindi translation\",\n"
        f"  \"micro_details_missed\": \"broadcast detail missed\",\n"
        f"  \"player_card_batsman\": \"batsman stat card\",\n"
        f"  \"player_card_bowler\": \"bowler stat card\",\n"
        f"  \"pitch_map_zone\": \"pitching zone\",\n"
        f"  \"bat_speed_estimate\": \"swing speed intent\",\n"
        f"  \"footwork_analysis\": \"footwork description\",\n"
        f"  \"historical_stat\": \"relevant stat\",\n"
        f"  \"partnership_context\": \"chase math\",\n"
        f"  \"weakness_exploited\": \"weakness noted\",\n"
        f"  \"next_tactical_move\": \"logical captain move\"\n"
        f"}}"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.95
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=body, timeout=12)
        response.raise_for_status()
        res_json = response.json()
        
        candidates = res_json.get("candidates", [])
        if candidates:
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if parts:
                text_content = parts[0].get("text", "").strip()
                parsed = json.loads(text_content)
                # Enforce structure
                required_keys = ["insight", "coach_review", "win_prob_explainer", "crowd_chant", 
                                 "emoji_reel", "headline", "quiz_question", "quiz_options", 
                                 "quiz_answer_idx", "poll_question", "poll_options", "fan_sentiment",
                                 "press_quote", "bowler_threat", "milestone_prediction", "momentum_diff",
                                 "director_cut", "super_over", "field_placement", "parallel_dimension",
                                 "weather_micro", "parody_ad", "decibel_cheer", "precog_script",
                                 "glossary_jargon", "hindi_trans"]
                if all(k in parsed for k in required_keys):
                    parsed["quiz_options"] = parsed["quiz_options"][:2]
                    parsed["poll_options"] = parsed["poll_options"][:2]
                    return parsed
        print(f"Gemini multi-feature parser returned error: {res_json}")
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        
    # --- Offline high-fidelity fallback ---
    fallbacks = {
        "wicket": {
            "insight": "Out! Mohammad Nawaz strikes, Dinesh Karthik stumped down leg side! Melbourne is in absolute frenzy!",
            "coach_review": "The batting side needs to play simple block shots for the remaining deliveries to avoid a total collapse.",
            "win_prob_explainer": "Losing a set batsman at this critical stage drops India's victory chances by 18%.",
            "crowd_chant": "Nawaz! Nawaz! Spin wizard on target! 🇵🇰⚡",
            "emoji_reel": "🔴🏏☠️🧤😢💥🚫🇵🇰",
            "headline": "MELBOURNE SHELL-SHOCKED: ANOTHER WICKET FALLS IN DRAMATIC FINISH!",
            "quiz_question": "Who was India's captain in T20 WC 2022?",
            "quiz_options": ["Rohit Sharma", "Virat Kohli"],
            "quiz_answer_idx": 0,
            "poll_question": "Will India successfully secure the final run on the next ball?",
            "poll_options": ["Yes, Ashwin has the cool!", "No, Nawaz will strike again"],
            "fan_sentiment": "96% Tension",
            "press_quote": "Captain Babar Azam: 'That wicket of Karthik was extremely crucial. Nawaz executed the plan beautifully under immense pressure.'",
            "bowler_threat": "Mohammad Nawaz: High Threat. Deliveries are spinning sharp and low down leg.",
            "milestone_prediction": "Virat Kohli: 98% Chance of 80*. Complete tactical lock in the chase.",
            "momentum_diff": "Pakistan 65% | India 35% (Pakistan gains massive ground on wicket)",
            "director_cut": "Camera Director: Cut to close-up of Kohli's eyes, wide and focused under helmet. Next, slow-pan to Pakistani captain rearranging deep mid-wicket fields.",
            "super_over": "Super Over Calculation: India: 18/1 (Kohli 12*, Hardik 6, Bowler: Afridi) | Pakistan: 14/2 (Babar 8, Rizwan 4, Bowler: Bumrah). Projected Winner: India!",
            "field_placement": "Field Alignment: Sweeper Cover is pushed back to boundary, Mid-on is up in the circle. Bowler is angling into ribs to choke Kohli.",
            "parallel_dimension": "Parallel Dimension: This ball mirrors Sachin's legendary straight drive in Sharjah 1998 off Kasprowicz!",
            "weather_micro": "Micro-climate Projection: Damp sea breeze coming over Melbourne is making ball swing 0.8 degrees extra. Seamers get slight edge.",
            "parody_ad": "🔥 SPONSOR SHOUT-OUT: This massive hit brought to you by 'King Kohli's Windshield Shield' - Protect your stadium glass windows from high-altitude leather! 😂",
            "decibel_cheer": "114 dB - Jet Engine roar! Melbourne stadium crowd is vibrating at historic seismic levels!",
            "precog_script": "Pre-cog Script: Next ball: Single to long-on. 2nd ball: Hardik plays a sweep for two. 3rd ball: Dot ball outside off-stump.",
            "glossary_jargon": "Free-hit: A rare tactical luxury. Wickets (except run-outs) do not result in dismissal, allowing batsmen to strike with 100% force.",
            "hindi_trans": "दिनेश कार्तिक स्टंप्ड! नवाज़ ने भारत को दिया बड़ा झटका। मेल्बर्न स्टेडियम में सन्नाटा छा गया है!"
        },
        "six": {
            "insight": "Smacked! Virat Kohli launches it straight down the ground back over Nawaz's head! Pure theatrical magic!",
            "coach_review": "Maintain this heavy bat swing but keep high balance. Bowling length is straying under pressure.",
            "win_prob_explainer": "A massive boundary instantly shifts momentum, adding 12% probability to India's chase.",
            "crowd_chant": "KING KOHLI! KING KOHLI! KING OF CHASE! 👑🇮🇳",
            "emoji_reel": "🚀🏏💥👑👑🏟️🇮🇳🙌🍿",
            "headline": "MELBOURNE UNBELIEVABLE: KOHLI SMASHES AN IMPOSSIBLE STRAIGHT SIX!",
            "quiz_question": "Against which team did Virat Kohli score his famous 82* in 2022?",
            "quiz_options": ["Pakistan", "Australia"],
            "quiz_answer_idx": 0,
            "poll_question": "Will the batsman smash another six in this over?",
            "poll_options": ["Absolutely, king is charged!", "No, bowler will pull length back"],
            "fan_sentiment": "98% Hype",
            "press_quote": "Captain Rohit Sharma: 'That straight six off Haris Rauf will be remembered as the greatest shot in T20 World Cup history.'",
            "bowler_threat": "Haris Rauf: Medium Threat. Express pace is leaking runs under Kohli's attack.",
            "milestone_prediction": "Virat Kohli: 95% Chance of 80. Striking boundaries with effortless precision.",
            "momentum_diff": "India 80% | Pakistan 20% (IND has absolute tactical control in Melbourne)",
            "director_cut": "Director Cut: Zoom on Rauf's hands on head. Crowd leaping in row Q. Emerald flags waving in slow-motion.",
            "super_over": "Super Over Simulation: India: 22/0 (Kohli 18*) | Pakistan: 16/1. Winner: India by 6 runs.",
            "field_placement": "Field Alignment: Long on is deep at boundary edge. Off-side third man brought inside circle.",
            "parallel_dimension": "Parallel Dimension: Mirrors Kohli's hook off Mitchell Johnson in Adelaide 2014.",
            "weather_micro": "Micro-climate: Dew is beginning to settle, making ball skid slightly faster off the pitch.",
            "parody_ad": "🔥 SPONSOR: This massive hit brought to you by 'Rauf's Courier Service' - Fast delivery guaranteed! 😂",
            "decibel_cheer": "119 dB - Volcanic eruption! Decibel meters are breaking down under crowd screaming!",
            "precog_script": "Pre-cog Script: Next ball: Flat six over fine leg. 2nd ball: Wide. 3rd ball: Bowled but runs on bye.",
            "glossary_jargon": "Free-hit: A penalty delivery where batsman cannot be dismissed, allowing maximum boundary swing.",
            "hindi_trans": "अविश्वसनीय छक्का! कोहली ने हरीश रउफ की गेंद को सीधे बाउंड्री के बाहर भेजा। मेल्बर्न झूम उठा है!"
        }
    }
    return fallbacks.get(event, {
        "insight": f"An intense '{event}' moment! Both sides are locked in a tactical war of nerves.",
        "coach_review": "Minimize risks and push for quick singles. Keep strike rotating regularly.",
        "win_prob_explainer": "Tension levels are maximum as balls remaining counts down. Win probability remains tight.",
        "crowd_chant": "Let's Go India! Fight till the last ball! 🇮🇳🏟️",
        "emoji_reel": "🏏🏟️🔥💥🍿🙌👀⚡",
        "headline": "CRICKET WAR IN MELBOURNE: REAL-TIME TACTICS SHIFT ON EVERY DELIVERY!",
        "quiz_question": "What is the maximum overs allowed in T20 match?",
        "quiz_options": ["20 overs", "50 overs"],
        "quiz_answer_idx": 0,
        "poll_question": "Who will dominate the next 3 deliveries?",
        "poll_options": ["Batting Team", "Bowling Team"],
        "fan_sentiment": "78% Tension",
        "press_quote": "Captain Babar Azam: 'Every run is crucial here. We are defending our lines with maximum energy.'",
        "bowler_threat": "Active Bowler: Medium Threat. Decent lines but batsmen are finding quick runs.",
        "milestone_prediction": "Batsmen pair: 85% Chance of completing partnership. Focus is maximum.",
        "momentum_diff": "India 50% | Pakistan 50% (Deadlock battle in the death overs)",
        "director_cut": "Director Cut: Pan of spectators holding breath. Close up of batsman wiping brow.",
        "super_over": "Super Over Projected: India 15/1 | Pakistan 13/2. India wins.",
        "field_placement": "Field Alignment: Gaps open between mid-wicket and deep long-on.",
        "parallel_dimension": "Parallel Dimension: Reflects Dhoni's classic double down long-on in World Cup 2011.",
        "weather_micro": "Micro-climate: Gentle wind blowing toward deep covers assisting boundary swings.",
        "parody_ad": "🔥 SPONSOR: This tense moment brought to you by 'Anti-Stress Stadium Popcorn'!",
        "decibel_cheer": "98 dB - High Stadium humming.",
        "precog_script": "Pre-cog Script: Next ball: Single. 2nd ball: Double. 3rd ball: Single.",
        "glossary_jargon": "Yorker: A delivery landing right on the batsman's toes, designed to block under-swing boundaries.",
        "hindi_trans": "रोमांचक मुकाबला चालू है। हर गेंद पर दबाव बढ़ता जा रहा है!"
    })

# --- Translation endpoint for Gemini ---
@app.post("/translate")
def translate_text(
    req: TranslateRequest = Body(...),
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={x_gemini_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = (
        f"You are a professional cricket commentary translator.\n"
        f"Translate this commentary text into high-energy '{req.lang}' style:\n"
        f"'{req.text}'\n\n"
        f"Return ONLY the plain translated text without quotes or explanations."
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        res = requests.post(url, headers=headers, json=body, timeout=8)
        res.raise_for_status()
        data = res.json()
        candidates = data.get("candidates", [])
        if candidates:
            trans_text = candidates[0]["content"]["parts"][0]["text"].strip()
            return {"translated": trans_text}
    except Exception as e:
        print(f"Error in translation: {e}")
        
    # fallback
    fallbacks = {
        "Hindi": "यह एक रोमांचक क्रिकेट क्षण है! दोनों टीमें जीत के लिए संघर्ष कर रही हैं।",
        "Spanish": "¡Qué momento tan emocionante en el cricket! Ambos equipos luchan duro.",
        "Aussie": "Crikey! What an absolute beauty of a match! Both sides are going flat out, mate!"
    }
    return {"translated": fallbacks.get(req.lang, req.text)}

# --- Simulated and score update endpoints ---

@app.get("/match")
def get_match(
    x_gemini_key: str = Header(None),
    x_cricapi_key: str = Header(None)
):
    if not x_gemini_key or not x_cricapi_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    try:
        url = f"https://api.cricapi.com/v1/currentMatches?apikey={x_cricapi_key}"
        res = requests.get(url, timeout=4)
        data = res.json()
        if data.get("status") == "success" and data.get("data"):
            matches = data["data"]
            live_matches = [m for m in matches if m.get("matchStarted") and not m.get("matchEnded")]
            target = live_matches[0] if live_matches else matches[0]
            
            score_text = "No score logged yet"
            scores = target.get("score", [])
            if scores:
                score_text = " | ".join([f"{s.get('inning')}: {s.get('r')}/{s.get('w')} ({s.get('o')} overs)" for s in scores])
                
            teams = target.get("teams", ["Team A", "Team B"])
            
            cric_match = {
                "match_id": target.get("id"),
                "name": target.get("name"),
                "status": target.get("status", "Live Match"),
                "team_1": teams[0] if len(teams) > 0 else "Team 1",
                "team_2": teams[1] if len(teams) > 1 else "Team 2",
                "batting_team": teams[0] if len(teams) > 0 else "Team 1",
                "score_text": score_text,
                "runs": 128,
                "wickets": 4,
                "overs": 15.0,
                "batsmen": [
                    {"name": "Batsman 1", "runs": 40, "balls": 25, "is_strike": True},
                    {"name": "Batsman 2", "runs": 22, "balls": 18, "is_strike": False}
                ],
                "bowler": {"name": "Bowler 1", "overs": 2.0, "wickets": 1, "runs": 14},
                "is_mock": False
            }
            return {"match": cric_match, "active_event": active_event}
    except Exception:
        pass
        
    return {"match": mock_match, "active_event": active_event}

@app.post("/event")
def create_event(
    req: EventRequest = Body(...),
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    ai_features = call_gemini_multifeature(req.event, req.score_text, req.persona, x_gemini_key)
    
    global active_event
    active_event = {
        "event_type": req.event,
        "insight": ai_features["insight"],
        "coach_review": ai_features["coach_review"],
        "win_prob_explainer": ai_features["win_prob_explainer"],
        "crowd_chant": ai_features["crowd_chant"],
        "emoji_reel": ai_features["emoji_reel"],
        "headline": ai_features["headline"],
        "quiz_question": ai_features["quiz_question"],
        "quiz_options": ai_features["quiz_options"],
        "quiz_answer_idx": ai_features["quiz_answer_idx"],
        "poll_question": ai_features["poll_question"],
        "poll_options": ai_features["poll_options"],
        "fan_sentiment": ai_features["fan_sentiment"],
        "press_quote": ai_features["press_quote"],
        "bowler_threat": ai_features["bowler_threat"],
        "milestone_prediction": ai_features["milestone_prediction"],
        "momentum_diff": ai_features["momentum_diff"],
        
        "director_cut": ai_features["director_cut"],
        "super_over": ai_features["super_over"],
        "field_placement": ai_features["field_placement"],
        "parallel_dimension": ai_features["parallel_dimension"],
        "weather_micro": ai_features["weather_micro"],
        "parody_ad": ai_features["parody_ad"],
        "decibel_cheer": ai_features["decibel_cheer"],
        "precog_script": ai_features["precog_script"],
        "glossary_jargon": ai_features["glossary_jargon"],
        "hindi_trans": ai_features["hindi_trans"],
        
        "votes": {"option_0": 0, "option_1": 0}
    }
    return active_event

@app.post("/predict")
def predict(req: PredictRequest = Body(...)):
    global active_event
    opt_key = f"option_{req.option_index}"
    if opt_key in active_event["votes"]:
        active_event["votes"][opt_key] += 1
    else:
        active_event["votes"][opt_key] = 1
        
    tot = sum(active_event["votes"].values())
    percentages = {k: round((v / tot) * 100) if tot > 0 else 0 for k, v in active_event["votes"].items()}
    
    return {
        "votes": active_event["votes"],
        "percentages": percentages,
        "total_votes": tot
    }

@app.post("/what-if")
def what_if(
    req: WhatIfRequest = Body(...),
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={x_gemini_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = (
        f"You are the Oracle AI Cricket projecting scenario calculations for 'The 12th Man'.\n"
        f"The fan typed this 'What If' question: '{req.query}'.\n"
        f"The current live score is: '{req.score_text}'.\n\n"
        f"Analyze the query and calculate:\n"
        f"1. A witty projection: Exactly 2 exciting sentences projecting how the score and tactical dynamic would change if this scenario happens.\n"
        f"2. Projected Win Probability Shift (e.g. 'IND shifts +14% (new prob: 66%)').\n\n"
        f"Respond ONLY with a JSON object in this format:\n"
        f"{{\n"
        f"  \"projection\": \"Your 2-sentence tactical projection text here.\",\n"
        f"  \"prob_shift\": \"IND/PAK shifts +/-XX% (new prob: YY%)\"\n"
        f"}}"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.9
        }
    }
    
    try:
        res = requests.post(url, headers=headers, json=body, timeout=10)
        res.raise_for_status()
        data = res.json()
        candidates = data.get("candidates", [])
        if candidates:
            text = candidates[0]["content"]["parts"][0]["text"].strip()
            parsed = json.loads(text)
            if "projection" in parsed and "prob_shift" in parsed:
                return parsed
    except Exception as e:
        print(f"Error in What-If: {e}")
        
    return {
        "projection": f"If '{req.query}' occurs, it would trigger massive tactical shifts! Batsmen would change strike rates immediately under deep pressure.",
        "prob_shift": "IND Win probability shifts +/-8% (new prob: 54%)"
    }

@app.post("/set-ball")
def set_ball(
    req: SetBallRequest = Body(...),
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    if req.ball_id < 0 or req.ball_id >= len(MELBOURNE_DATASET):
        raise HTTPException(status_code=400, detail="Invalid ball ID")
        
    ball_state = MELBOURNE_DATASET[req.ball_id]
    
    global mock_match
    mock_match = {
        "match_id": "melbourne-2022-t20wc",
        "name": ball_state["name"],
        "status": ball_state["status"],
        "team_1": ball_state["team_1"],
        "team_2": ball_state["team_2"],
        "batting_team": ball_state["batting_team"],
        "runs": ball_state["runs"],
        "wickets": ball_state["wickets"],
        "overs": ball_state["overs"],
        "score_text": ball_state["score_text"],
        "batsmen": ball_state["batsmen"],
        "bowler": ball_state["bowler"],
        "recent_ball": ball_state["recent_ball"],
        "is_mock": True
    }
    
    event_type = "single"
    if "SIX" in ball_state["status"].upper():
        event_type = "six"
    elif "FOUR" in ball_state["status"].upper():
        event_type = "four"
    elif "WICKET" in ball_state["status"].upper() or "DK STUMPED" in ball_state["status"].upper():
        event_type = "wicket"
        
    ai_features = call_gemini_multifeature(event_type, ball_state["score_text"], req.persona, x_gemini_key)
    
    global active_event
    active_event = {
        "event_type": event_type,
        "insight": ai_features["insight"],
        "coach_review": ai_features["coach_review"],
        "win_prob_explainer": ai_features["win_prob_explainer"],
        "crowd_chant": ai_features["crowd_chant"],
        "emoji_reel": ai_features["emoji_reel"],
        "headline": ai_features["headline"],
        "quiz_question": ai_features["quiz_question"],
        "quiz_options": ai_features["quiz_options"],
        "quiz_answer_idx": ai_features["quiz_answer_idx"],
        "poll_question": ai_features["poll_question"],
        "poll_options": ai_features["poll_options"],
        "fan_sentiment": ai_features["fan_sentiment"],
        "press_quote": ai_features["press_quote"],
        "bowler_threat": ai_features["bowler_threat"],
        "milestone_prediction": ai_features["milestone_prediction"],
        "momentum_diff": ai_features["momentum_diff"],
        
        "director_cut": ai_features["director_cut"],
        "super_over": ai_features["super_over"],
        "field_placement": ai_features["field_placement"],
        "parallel_dimension": ai_features["parallel_dimension"],
        "weather_micro": ai_features["weather_micro"],
        "parody_ad": ai_features["parody_ad"],
        "decibel_cheer": ai_features["decibel_cheer"],
        "precog_script": ai_features["precog_script"],
        "glossary_jargon": ai_features["glossary_jargon"],
        "hindi_trans": ai_features["hindi_trans"],
        
        "votes": {"option_0": 0, "option_1": 0}
    }
    
    return {
        "match": mock_match,
        "active_event": active_event
    }

@app.get("/simulate/{event}")
def simulate_event(
    event: str,
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    global current_batsman_index, active_event
    
    if event == "six":
        mock_match["runs"] += 6
        progress_ball(6)
        mock_match["recent_ball"] = "6"
    elif event == "four":
        mock_match["runs"] += 4
        progress_ball(4)
        mock_match["recent_ball"] = "4"
    elif event == "wicket":
        mock_match["wickets"] += 1
        progress_ball(0)
        mock_match["recent_ball"] = "W"
        for i, b_man in enumerate(mock_match["batsmen"]):
            if b_man["is_strike"]:
                new_name = available_batsmen[current_batsman_index % len(available_batsmen)]
                current_batsman_index += 1
                mock_match["batsmen"][i] = {"name": new_name, "runs": 0, "balls": 0, "is_strike": True}
                break
                
    mock_match["score_text"] = f"{mock_match['team_1']}: {mock_match['runs']}/{mock_match['wickets']} ({mock_match['overs']:.1f} overs)"
    mock_match["status"] = f"Simulated Event: {event.upper()}! Play is on fire."
    
    ai_features = call_gemini_multifeature(event, mock_match["score_text"], "Harsha Bhogle", x_gemini_key)
    
    active_event = {
        "event_type": event,
        "insight": ai_features["insight"],
        "coach_review": ai_features["coach_review"],
        "win_prob_explainer": ai_features["win_prob_explainer"],
        "crowd_chant": ai_features["crowd_chant"],
        "emoji_reel": ai_features["emoji_reel"],
        "headline": ai_features["headline"],
        "quiz_question": ai_features["quiz_question"],
        "quiz_options": ai_features["quiz_options"],
        "quiz_answer_idx": ai_features["quiz_answer_idx"],
        "poll_question": ai_features["poll_question"],
        "poll_options": ai_features["poll_options"],
        "fan_sentiment": ai_features["fan_sentiment"],
        "press_quote": ai_features["press_quote"],
        "bowler_threat": ai_features["bowler_threat"],
        "milestone_prediction": ai_features["milestone_prediction"],
        "momentum_diff": ai_features["momentum_diff"],
        
        "director_cut": ai_features["director_cut"],
        "super_over": ai_features["super_over"],
        "field_placement": ai_features["field_placement"],
        "parallel_dimension": ai_features["parallel_dimension"],
        "weather_micro": ai_features["weather_micro"],
        "parody_ad": ai_features["parody_ad"],
        "decibel_cheer": ai_features["decibel_cheer"],
        "precog_script": ai_features["precog_script"],
        "glossary_jargon": ai_features["glossary_jargon"],
        "hindi_trans": ai_features["hindi_trans"],
        
        "votes": {"option_0": 0, "option_1": 0}
    }
    
    return {
        "match": mock_match,
        "active_event": active_event
    }

class BuddyChatRequest(BaseModel):
    query: str
    score_text: str
    recent_ball: str
    status: str

@app.post("/couch-buddy-chat")
def couch_buddy_chat(
    req: BuddyChatRequest = Body(...),
    x_gemini_key: str = Header(None)
):
    if not x_gemini_key:
        raise HTTPException(status_code=400, detail="API keys missing")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={x_gemini_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = (
        f"You are Gemini, the user's ultimate cricket best friend sitting on the couch right next to them, watching the match live!\n"
        f"You are passionate, extremely supportive of the batting team, street-smart, funny, and casual (using words like 'bro', 'mate', 'no way', 'insane', 'absolute cheat code', 'oof').\n"
        f"The current score is '{req.score_text}' and the last ball play was '{req.recent_ball}' (status: {req.status}).\n"
        f"Your best friend sitting next to you just said: '{req.query}'.\n\n"
        f"Respond directly to them as a supportive, funny cricket buddy. Keep it to exactly 2 sentences max. Be energetic and high-spirited!"
    )
    
    body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.95
        }
    }
    
    try:
        res = requests.post(url, headers=headers, json=body, timeout=10)
        res.raise_for_status()
        data = res.json()
        candidates = data.get("candidates", [])
        if candidates:
            reply_text = candidates[0]["content"]["parts"][0]["text"].strip()
            return {"reply": reply_text}
    except requests.exceptions.HTTPError as e:
        print(f"Error in couch buddy chat: {e}")
        if e.response is not None:
            print(f"Gemini API Response: {e.response.text}")
    except Exception as e:
        print(f"Error in couch buddy chat: {e}")
        
    return {"reply": "Bro, that is absolutely wild! Let's just focus on the next ball, Virat is definitely going to lock this in! 🏏"}

