# Agentic Premier League: Advanced Cricket Analytics Dashboard

A high-fidelity, real-time analytics companion application designed to provide deep structural insights during live cricket matches. The platform leverages advanced artificial intelligence models to process match state data and deliver specialized metrics, tactical predictions, and dynamic visual profiles that traditional broadcasts often overlook.

---

## Core Infrastructure & Capabilities

1. Deep Tactical Analytics
The system generates ten concurrent streams of advanced analytics on a per-ball basis. These include footwork breakdown, pitch map zoning, bat speed estimation, historical statistical alignment, and tactical weakness exploitation models.

2. Dynamic Visual Broadcast Interface
Information is rendered using a highly visual React dashboard, which replaces traditional plain text with custom SVG integrations, dynamic gradient profiles, and conditional metric rendering. Features include FIFA-style player skill cards, half-circle dial speedometers for bat swing, and an interactive 2D pitch heat map.

3. Autonomous Commentary Agent
Powered by the Google Gemini Flash API, the system autonomously analyzes score differentials, run rates, and individual ball events to synthesize real-time commentary, simulating an active analyst evaluating the game's momentum.

4. Secure Environment Architecture
Application security relies on runtime environment variables rather than exposed client-side hardcoding. Development keys are strictly isolated in local `.env` files that are universally ignored by version control mechanisms, ensuring complete repository safety.

---

## Technical Stack

* Frontend Ecosystem: React, Vite, Tailwind CSS
* Backend Architecture: Python, FastAPI, Uvicorn (In-memory, stateless configuration)
* Generative Integration: Google Gemini Flash Latest API

---

## Deployment Configuration

Prerequisites: Python 3 and Node.js environments must be active.

### Backend Initialization
1. Navigate to the backend directory and install the required dependencies:
   `pip3 install fastapi uvicorn requests pydantic`
2. Initialize the ASGI server via Uvicorn:
   `python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`
   The service will bind to port 8000.

### Frontend Initialization
1. From the project root, navigate to the frontend directory:
   `cd frontend`
2. Install package dependencies:
   `npm install`
3. Configure the local environment:
   Create a `.env` file in the frontend directory and define `VITE_GEMINI_API_KEY` and `VITE_CRIC_API_KEY`.
4. Launch the local development server:
   `npm run dev`
   The application will become accessible on port 5173.

---

## Application Interaction

Upon mounting the application, the UI automatically sources the required API keys from the local `.env` configuration, bypassing any need for manual modal data entry. The dashboard engages a polling mechanism against the local FastAPI instance. 

Users can monitor the graphical pitch maps, the player cards, and the tactical "Next Move" indicators as the application simulates ball-by-ball developments. Interactive timeline controls are provided to cycle through events and review the AI-synthesized outputs dynamically.
