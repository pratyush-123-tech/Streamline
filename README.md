# Streamline

A video calling app built with WebRTC and Socket.IO, with live speech-to-text, AI-generated meeting summaries, and in-call chat.

## Features

- **Multi-party video calling** — peer-to-peer video/audio via WebRTC, with mute/unmute, camera toggle, and screen sharing
- **Real-time signaling** — Socket.IO handles offer/answer exchange and ICE candidate relay between peers
- **Live transcription** — each participant's speech is transcribed locally in-browser (Web Speech API) and shared across the call
- **AI meeting summaries** — when a call ends, the full transcript is sent to an LLM (Groq) which generates an overview, key points, and action items
- **Downloadable records** — export the full transcript as `.txt` or the summary as `.pdf` after a call
- **In-call chat** — real-time text messaging visible to everyone in the room, with chat history replayed for participants who join mid-call
- **Authentication** — user signup/login with hashed passwords (bcrypt) and JWT-based sessions

## Tech Stack

**Frontend:** React, Vite, Material UI, Socket.IO client, jsPDF
**Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), bcrypt, JWT

## Architecture

```
┌─────────────┐         WebRTC (P2P media)        ┌─────────────┐
│  Browser A  │ ◄────────────────────────────────► │  Browser B  │
└──────┬──────┘                                     └──────┬──────┘
       │           Socket.IO (signaling, chat,             │
       │           transcript chunks, summary)             │
       └───────────────────┬─────────────────────────────────┘
                            ▼
                  ┌───────────────────┐
                  │   Node/Express     │
                  │   + Socket.IO      │
                  │   server           │
                  └─────────┬──────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
         ┌────────────┐         ┌──────────────┐
         │  MongoDB   │         │  Groq API    │
         │ (users,    │         │  (summary     │
         │ transcripts)│        │  generation)  │
         └────────────┘         └──────────────┘
```

Video and audio streams flow directly between participants' browsers (peer-to-peer). The server's role is signaling only — it never touches the media itself. It does, however, relay transcript text chunks, store them per meeting, and call the Groq API to generate a summary once a call ends.

## How it works

1. **Joining a call** — a participant connects to the Socket.IO server and emits `join-call` with the room's URL. The server tracks all participants per room and notifies everyone when someone joins or leaves.
2. **Establishing peer connections** — for each pair of participants, an `RTCPeerConnection` is created. SDP offers/answers and ICE candidates are exchanged through the server (`signal` event) until a direct peer-to-peer media connection is established.
3. **Transcription** — each browser runs the Web Speech API on its own microphone. Finalized sentences are sent to the server (`transcript-chunk`) and relayed to other participants, so a combined transcript builds up across the whole call.
4. **Ending a call** — the client emits `end-meeting`. The server joins the collected transcript lines, sends them to Groq's chat completion API with a summarization prompt, saves the result to MongoDB, and sends the summary back to the client.
5. **Chat** — messages are broadcast to everyone currently in the room via the `chat-message` event, and the server replays message history to anyone who joins after messages have already been sent.

## Setup

### Prerequisites
- Node.js 18+
- A MongoDB connection string (e.g. from MongoDB Atlas)
- A free Groq API key (https://console.groq.com)

### Backend
```bash
cd backend
npm install
```
Create a `.env` file in `backend/`:
```
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
PORT=8080
```
Run it:
```bash
npm run dev
```

### Frontend
```bash
cd streamline-frontend
npm install
npm run dev
```
Open the printed local URL (typically `http://localhost:5173`).

## Known limitations

- Live transcription relies on the Web Speech API, which is only supported in Chromium-based browsers (Chrome, Edge)
- Transcripts are held in memory per active meeting and cleared once the meeting ends; only the final transcript + summary are persisted to MongoDB
- Single-server signaling architecture — not designed to scale beyond a handful of concurrent rooms without additional work (e.g. a message broker for multi-instance deployments)
- No automated tests yet

## License

This project is for educational purposes.
