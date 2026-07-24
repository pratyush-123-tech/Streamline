import React, { useEffect, useRef, useState } from "react"
import io from "socket.io-client";
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import jsPDF from "jspdf"
import { useNavigate } from "react-router-dom"
import { IconButton } from '@mui/material';
import "./VideoCall.css"
var connections = {};

const server_url = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";


const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // TURN server – required for peers behind different NATs (e.g. mobile vs home)
        // Credentials come from Metered.ca (set VITE_TURN_USERNAME + VITE_TURN_PASSWORD in .env)
        ...(import.meta.env.VITE_TURN_USERNAME ? [
            {
                urls: "turn:a.relay.metered.ca:80",
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_PASSWORD,
            },
            {
                urls: "turn:a.relay.metered.ca:443",
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_PASSWORD,
            },
            {
                urls: "turns:a.relay.metered.ca:443?transport=tcp",
                username: import.meta.env.VITE_TURN_USERNAME,
                credential: import.meta.env.VITE_TURN_PASSWORD,
            },
        ] : []),
    ],
};

export default function VideoCall(){
    const navigate = useNavigate();
    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(true);

    let [audio, setAudio] = useState(true);

    let [screen, setScreen] = useState(false);

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [showChat, setShowChat] = useState(false);
    const showChatRef = useRef(false);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");
    const usernameRef = useRef(""); // stable ref so closures always see latest username
    // Refs for current av state – avoids stale closures in socket emit callbacks
    const audioRef = useRef(true);
    const videoStateRef = useRef(true);

    const videoRef = useRef([])

    let [videos, setVideos] = useState([]);

    // ---------- peer meta: username + av state for each remote socket ----------
    // { [socketId]: { username: string, audio: bool, video: bool } }
    const [peerMeta, setPeerMeta] = useState({});

    // ---------- transcription + summary state ----------
    const recognitionRef = useRef(null);
    const [interimText, setInterimText] = useState("");
    const [captions, setCaptions] = useState([]); // combined transcript: local + remote chunks, used for end-of-meeting screen only
    const meetingPathRef = useRef(""); // mirrors the "path" used in join-call (window.location.href)

    // ---------- end-of-meeting screen state ----------
    const [meetingEnded, setMeetingEnded] = useState(false);
    const [activeTab, setActiveTab] = useState("transcript"); // "transcript" | "summary"
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }
    
    let handleScreen=()=>{
        setScreen(!screen);
    }
    const getPermisssions = async () => {
        try {
            let videoStream = null;
            let audioStream = null;
            
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setVideoAvailable(true);
            } catch (e) {
                setVideoAvailable(false);
            }

            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioAvailable(true);
            } catch (e) {
                setAudioAvailable(false);
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoStream || audioStream) {
                const tracks = [];
                if (videoStream) tracks.push(...videoStream.getVideoTracks());
                if (audioStream) tracks.push(...audioStream.getAudioTracks());
                
                const userMediaStream = new MediaStream(tracks);
                window.localStream = userMediaStream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = userMediaStream;
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
     

    useEffect(()=>{
        getPermisssions();
    },[])
    let getUserMediaSuccess=(stream)=>{
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }
    let silence=()=>{
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black=({height=640,width=480}={})=>{
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })

    }
    let gotMessageFromServer=(fromId,message)=>{
        if (!message || typeof message !== "string") {
            console.warn("Invalid message received:", message);
            return;
        }
    
        let signal;
        try {
            signal = JSON.parse(message);
        } catch (e) {
            console.error("Failed to parse message:", message);
            return;
        }

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }
    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence();
            localVideoref.current.srcObject = window.localStream;

            getUserMedia();

        })
    }
    let handleVideo = () => {
        const videoTrack = localVideoref.current?.srcObject?.getVideoTracks()[0];
        if (videoTrack) {
            const newState = !videoTrack.enabled;
            videoTrack.enabled = newState;
            videoStateRef.current = newState;
            setVideo(newState);
            // broadcast av state change to peers
            if (socketRef.current) {
                socketRef.current.emit('av-change', { audio: audioRef.current, video: newState });
            }
        }
    };
    
    let handleAudio = () => {
        const audioTrack = localVideoref.current?.srcObject?.getAudioTracks()[0];
        if (audioTrack) {
            const newState = !audioTrack.enabled;
            audioTrack.enabled = newState;
            audioRef.current = newState;
            setAudio(newState);
            // broadcast av state change to peers
            if (socketRef.current) {
                socketRef.current.emit('av-change', { audio: newState, video: videoStateRef.current });
            }
            // tie live transcription to mic mute state
            if (newState) {
                startTranscription();
            } else {
                stopTranscription();
            }
        }
    };

    // ---------- chat functions ----------
    let addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender, data, socketIdSender }
        ]);
        // only bump the unread badge for messages from others, and only while the panel is closed
        if (socketIdSender !== socketIdRef.current && !showChatRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message.trim(), username || "You");
        setMessage("");
    };

    let toggleChat = () => {
        setShowChat((prev) => {
            const next = !prev;
            showChatRef.current = next;
            if (next) setNewMessages(0); // clear unread count when opening
            return next;
        });
    };


    let startTranscription = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser (use Chrome/Edge).");
            return;
        }
        if (recognitionRef.current) return; // already running

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    sendTranscriptChunk(transcriptPiece);
                } else {
                    interim += transcriptPiece;
                }
            }
            setInterimText(interim);
        };

        recognition.onerror = (event) => {
            if (event.error === "no-speech") return;
            console.error("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
            // browser stops itself after silence/~60s - restart if still meant to be on
            if (recognitionRef.current) {
                try { recognition.start(); } catch (e) {}
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {}
    };

    let stopTranscription = () => {
        if (recognitionRef.current) {
            const recognition = recognitionRef.current;
            recognitionRef.current = null; // clear first so onend doesn't restart it
            try { recognition.stop(); } catch (e) {}
        }
        setInterimText("");
    };

    let sendTranscriptChunk = (text) => {
        if (!text || !text.trim()) return;
        const payload = {
            path: meetingPathRef.current,
            userName: username || "You",
            text: text.trim(),
            timestamp: Date.now()
        };
        setCaptions((prev) => [...prev, payload]); // show locally right away
        if (socketRef.current) {
            socketRef.current.emit("transcript-chunk", payload);
        }
    };

    // ---------- NEW: end meeting -> show transcript+summary screen ----------
    let handleEndMeeting = () => {
        stopTranscription();

        // Stop local media tracks so the camera/mic light turns off
        try {
            window.localStream.getTracks().forEach((track) => track.stop());
        } catch (e) {}

        setMeetingEnded(true);
        setActiveTab("transcript");

        // Immediately request the summary in the background so it's ready
        // by the time the user clicks the "Summary" tab.
        setSummaryLoading(true);
        setSummaryError(null);
        if (socketRef.current) {
            socketRef.current.emit("end-meeting", { path: meetingPathRef.current });
        }
    };

    // ---------- NEW: download helpers ----------
    let downloadTranscriptAsTxt = () => {
        const text = captions
            .map((c) => `[${new Date(c.timestamp).toLocaleTimeString()}] ${c.userName}: ${c.text}`)
            .join("\n");
        const blob = new Blob([text || "No speech was transcribed during this meeting."], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "meeting-transcript.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    let downloadSummaryAsPdf = () => {
        const doc = new jsPDF();
        const text = summary || "No summary available.";
        doc.setFontSize(16);
        doc.text("Meeting Summary", 14, 18);
        doc.setFontSize(11);
        // wrap long text to fit page width (180mm usable width)
        const lines = doc.splitTextToSize(text, 180);
        doc.text(lines, 14, 30);
        doc.save("meeting-summary.pdf");
    };

    let connectToSocketServer=()=>{
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            meetingPathRef.current = window.location.href;
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            // Announce ourselves to peers already in the room
            socketRef.current.emit('user-meta', {
                username: usernameRef.current || "Guest",
                audio: true,
                video: true
            });

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
                // clean up that peer's meta
                setPeerMeta((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            })

            // receive transcript chunks from other participants
            socketRef.current.on('transcript-chunk', (payload) => {
                setCaptions((prev) => [...prev, payload]);
            });

            // receive the generated summary once the meeting ends
            socketRef.current.on('meeting-summary', ({ summary, error }) => {
                setSummaryLoading(false);
                if (error) {
                    setSummaryError(error);
                } else {
                    setSummary(summary);
                }
            });

            // receive username + av state from a peer (sent on join or re-announced)
            socketRef.current.on('user-meta', ({ socketId, username: peerName, audio: peerAudio, video: peerVideo }) => {
                setPeerMeta((prev) => ({
                    ...prev,
                    [socketId]: { username: peerName, audio: peerAudio, video: peerVideo }
                }));
            });

            // receive av toggle updates from a peer
            socketRef.current.on('av-change', ({ socketId, audio: peerAudio, video: peerVideo }) => {
                setPeerMeta((prev) => ({
                    ...prev,
                    [socketId]: { ...(prev[socketId] || {}), audio: peerAudio, video: peerVideo }
                }));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    // Do not create a connection for our own socket ID
                    if (socketListId === socketIdRef.current) return;
                    
                    // Do not overwrite an existing connection (this was crashing the call on 3rd user join)
                    if (connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }
    let getUserMedia=()=>{
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }
    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    let getMedia=()=>{
        setAudioAvailable(audioAvailable);
        setVideoAvailable(videoAvailable);
        connectToSocketServer();
    }
    let connect=()=>{
        usernameRef.current = username; // capture stable ref before closures form
        setAskForUsername(false);

        setTimeout(() => {
            if (localVideoref.current && window.localStream) {
                localVideoref.current.srcObject = window.localStream;
            }
        }, 0);

        getMedia();

        // start transcribing the local user's mic once they join
        setTimeout(() => startTranscription(), 500);
    }

    // ---------- post-call screen ----------
    if (meetingEnded) {
        return (
            <div className="end-root">
                <div className="end-card">
                    <div className="end-icon">📋</div>
                    <h2 className="end-title">Meeting Ended</h2>
                    <p className="end-sub">Your transcript and AI summary are ready.</p>

                    <div className="end-tabs">
                        <button
                            className={`end-tab${activeTab === "transcript" ? " active" : ""}`}
                            onClick={() => setActiveTab("transcript")}
                        >
                            📝 Transcript
                        </button>
                        <button
                            className={`end-tab${activeTab === "summary" ? " active" : ""}`}
                            onClick={() => setActiveTab("summary")}
                        >
                            🤖 AI Summary
                        </button>
                    </div>

                    {activeTab === "transcript" && (
                        <div>
                            <div className="end-content-box">
                                {captions.length === 0 && <p style={{ color: "#55556a" }}>No speech was transcribed during this meeting.</p>}
                                {captions.map((c, i) => (
                                    <p key={i} style={{ margin: "6px 0" }}>
                                        <strong style={{ color: "#ff8c42" }}>{c.userName}:</strong> {c.text}
                                    </p>
                                ))}
                            </div>
                            <button className="end-dl-btn" onClick={downloadTranscriptAsTxt}>
                                ⬇ Download Transcript (.txt)
                            </button>
                        </div>
                    )}

                    {activeTab === "summary" && (
                        <div>
                            <div className="end-content-box">
                                {summaryLoading && <p style={{ color: "#9898b0" }}>⏳ Generating summary, please wait…</p>}
                                {summaryError && <p style={{ color: "#f87171" }}>{summaryError}</p>}
                                {summary && <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem", margin: 0 }}>{summary}</pre>}
                            </div>
                            <button className="end-dl-btn" onClick={downloadSummaryAsPdf} disabled={!summary}>
                                ⬇ Download Summary (.pdf)
                            </button>
                        </div>
                    )}

                    <div className="end-close-row">
                        <button className="end-close-btn" onClick={() => navigate("/home")}>
                            ← Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }
     
    return (
        <div>
            {askForUsername === true ? (
                /* ── Lobby screen ── */
                <div className="lobby-root">
                    <div className="lobby-mesh" />
                    <div className="lobby-card">
                        <video
                            className="lobby-preview"
                            ref={localVideoref}
                            autoPlay
                            muted
                        />
                        <h2 className="lobby-title">Ready to join?</h2>
                        <p className="lobby-sub">Enter your display name to connect to the call.</p>
                        <input
                            id="lobby-username-input"
                            className="lobby-input"
                            placeholder="Your name…"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && connect()}
                            autoFocus
                        />
                        <button
                            id="lobby-connect-btn"
                            className="lobby-join-btn"
                            onClick={connect}
                        >
                            Join Now →
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Active call screen ── */
                <div className="meetVideoContainer">
                    {/* Remote videos */}
                    <div className="allUserVideo">
                        {videos.map((v) => {
                            const meta = peerMeta[v.socketId] || {};
                            const peerAudio = meta.audio !== false; // default true
                            const peerVideo = meta.video !== false; // default true
                            const peerName  = meta.username || "Guest";
                            return (
                                <div key={v.socketId} className="video-tile">
                                    <video
                                        data-ref={v.socketId}
                                        ref={(ref) => {
                                            if (ref && v.stream) ref.srcObject = v.stream;
                                        }}
                                        autoPlay
                                        muted
                                    />
                                    <div className="video-tile-bar">
                                        <span className="video-tile-name">{peerName}</span>
                                        <div className="video-tile-icons">
                                            {peerAudio
                                                ? <MicIcon className="tile-icon tile-icon--on" />
                                                : <MicOffIcon className="tile-icon tile-icon--off" />}
                                            {peerVideo
                                                ? <VideocamIcon className="tile-icon tile-icon--on" />
                                                : <VideocamOffIcon className="tile-icon tile-icon--off" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Local (self) PiP */}
                    <div className="local-pip-wrap">
                        <video className="userVideo" ref={localVideoref} autoPlay muted />
                        <div className="local-pip-bar">
                            <span className="video-tile-name">{username || "You"} (You)</span>
                            <div className="video-tile-icons">
                                {audio
                                    ? <MicIcon className="tile-icon tile-icon--on" />
                                    : <MicOffIcon className="tile-icon tile-icon--off" />}
                                {video
                                    ? <VideocamIcon className="tile-icon tile-icon--on" />
                                    : <VideocamOffIcon className="tile-icon tile-icon--off" />}
                            </div>
                        </div>
                    </div>

                    {/* Controls bar */}
                    <div className="buttonContainer">
                        <button
                            id="ctrl-video"
                            className={`ctrl-btn${!video ? " active" : ""}`}
                            onClick={handleVideo}
                            title={video ? "Turn off camera" : "Turn on camera"}
                        >
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </button>

                        <button
                            id="ctrl-audio"
                            className={`ctrl-btn${!audio ? " active" : ""}`}
                            onClick={handleAudio}
                            title={audio ? "Mute" : "Unmute"}
                        >
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </button>

                        {screenAvailable && (
                            <button
                                id="ctrl-screen"
                                className={`ctrl-btn${screen ? " active" : ""}`}
                                onClick={handleScreen}
                                title={screen ? "Stop sharing" : "Share screen"}
                            >
                                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </button>
                        )}

                        <button
                            id="ctrl-chat"
                            className="ctrl-btn"
                            onClick={toggleChat}
                            title="Chat"
                            style={{ position: "relative" }}
                        >
                            <ChatIcon />
                            {newMessages > 0 && (
                                <span style={{
                                    position: "absolute",
                                    top: 4, right: 4,
                                    width: 16, height: 16,
                                    borderRadius: "50%",
                                    background: "#ff8c42",
                                    color: "white",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>{newMessages > 9 ? "9+" : newMessages}</span>
                            )}
                        </button>

                        <button
                            id="ctrl-end"
                            className="ctrl-btn end-call"
                            onClick={handleEndMeeting}
                            title="End call"
                        >
                            <CallEndIcon />
                        </button>
                    </div>

                    {/* Chat slide-in panel */}
                    <div style={showChat ? styles.chatPanelOpen : styles.chatPanelClosed}>
                        <div style={styles.chatHeader}>
                            <div style={styles.chatHeaderTitle}>
                                <ChatIcon style={{ fontSize: 18, color: "#ff8c42" }} />
                                <span>In-call Messages</span>
                            </div>
                            <IconButton style={styles.chatCloseBtn} onClick={toggleChat} size="small">
                                ✕
                            </IconButton>
                        </div>

                        <div style={styles.chatMessages} className="chat-messages-scroll">
                            {messages.length === 0 && (
                                <div style={styles.chatEmptyState}>
                                    <ChatIcon style={{ fontSize: 28, color: "#4a4d57", marginBottom: 8 }} />
                                    <p style={styles.chatEmptyText}>No messages yet</p>
                                    <p style={styles.chatEmptySubtext}>Messages are visible to everyone on the call</p>
                                </div>
                            )}
                            {messages.map((m, i) => {
                                const isMine = m.socketIdSender === socketIdRef.current;
                                return (
                                    <div key={i} style={isMine ? styles.chatRowMine : styles.chatRowOther}>
                                        {!isMine && (
                                            <div style={styles.chatAvatar}>
                                                {(m.sender || "?").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div style={styles.chatBubbleGroup}>
                                            {!isMine && <span style={styles.chatSenderLabel}>{m.sender}</span>}
                                            <div style={isMine ? styles.chatBubbleMine : styles.chatBubbleOther}>
                                                {m.data}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.chatInputRow}>
                            <input
                                style={styles.chatInput}
                                className="chat-input-field"
                                placeholder="Send a message…"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                            />
                            <button
                                style={message.trim() ? styles.chatSendBtnActive : styles.chatSendBtn}
                                onClick={sendMessage}
                                disabled={!message.trim()}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    chatPanelClosed: {
        position: "fixed",
        top: 0,
        right: -360,
        width: 340,
        height: "100vh",
        background: "#16171a",
        color: "#e8e9ec",
        display: "flex",
        flexDirection: "column",
        transition: "right 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: 100,
        boxShadow: "-8px 0 24px rgba(0,0,0,0.45)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderLeft: "1px solid #26272c"
    },
    chatPanelOpen: {
        position: "fixed",
        top: 0,
        right: 0,
        width: 340,
        height: "100vh",
        background: "#16171a",
        color: "#e8e9ec",
        display: "flex",
        flexDirection: "column",
        transition: "right 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: 100,
        boxShadow: "-8px 0 24px rgba(0,0,0,0.45)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        borderLeft: "1px solid #26272c"
    },
    chatHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 18px 16px 20px",
        borderBottom: "1px solid #26272c"
    },
    chatHeaderTitle: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        color: "#f1f2f4"
    },
    chatCloseBtn: {
        color: "#8a8d96",
        width: 28,
        height: 28,
        fontSize: 13
    },
    chatMessages: {
        flex: 1,
        overflowY: "auto",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14
    },
    chatEmptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        marginTop: 60,
        padding: "0 30px"
    },
    chatEmptyText: {
        color: "#c2c4ca",
        fontSize: 14,
        fontWeight: 500,
        margin: "0 0 4px 0"
    },
    chatEmptySubtext: {
        color: "#65676f",
        fontSize: 12.5,
        margin: 0,
        lineHeight: 1.5
    },
    chatRowOther: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        animation: "chatFadeIn 0.18s ease-out"
    },
    chatRowMine: {
        display: "flex",
        justifyContent: "flex-end",
        animation: "chatFadeIn 0.18s ease-out"
    },
    chatAvatar: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "#3a3d46",
        color: "#c2c4ca",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 16
    },
    chatBubbleGroup: {
        display: "flex",
        flexDirection: "column",
        maxWidth: "78%"
    },
    chatSenderLabel: {
        fontSize: 11.5,
        fontWeight: 600,
        color: "#7d92c2",
        marginBottom: 3,
        marginLeft: 2,
        letterSpacing: 0.15
    },
    chatBubbleOther: {
        background: "#26272c",
        color: "#e8e9ec",
        padding: "9px 13px",
        borderRadius: "4px 14px 14px 14px",
        fontSize: 13.5,
        lineHeight: 1.45,
        wordBreak: "break-word"
    },
    chatBubbleMine: {
        background: "linear-gradient(135deg, #5b8def, #4a78d6)",
        color: "#ffffff",
        padding: "9px 13px",
        borderRadius: "14px 4px 14px 14px",
        fontSize: 13.5,
        lineHeight: 1.45,
        wordBreak: "break-word",
        maxWidth: "78%",
        marginLeft: "auto"
    },
    chatInputRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "14px 16px",
        borderTop: "1px solid #26272c",
        background: "#1a1b1f"
    },
    chatInput: {
        flex: 1,
        background: "#26272c",
        border: "1px solid #34363c",
        borderRadius: 20,
        padding: "10px 16px",
        fontSize: 13.5,
        color: "#e8e9ec",
        outline: "none",
        fontFamily: "inherit"
    },
    chatSendBtn: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        background: "#2a2b30",
        color: "#5a5d66",
        fontSize: 14,
        cursor: "not-allowed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
    },
    chatSendBtnActive: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        background: "#5b8def",
        color: "#ffffff",
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.15s ease"
    },
    endScreenWrap: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a1a"
    },
    endScreenCard: {
        background: "#fff",
        borderRadius: 12,
        padding: 28,
        width: "90%",
        maxWidth: 640,
        maxHeight: "85vh",
        overflowY: "auto"
    },
    tabRow: {
        display: "flex",
        gap: 10,
        marginBottom: 16
    },
    tab: {
        flex: 1,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid #ccc",
        background: "#f5f5f5",
        cursor: "pointer",
        fontSize: 14
    },
    tabActive: {
        flex: 1,
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid #1976d2",
        background: "#1976d2",
        color: "#fff",
        cursor: "pointer",
        fontSize: 14
    },
    contentBox: {
        background: "#f7f7f7",
        borderRadius: 8,
        padding: 14,
        minHeight: 200,
        maxHeight: 360,
        overflowY: "auto",
        fontSize: 14
    },
    closeRow: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 20
    },
    summaryPre: {
        whiteSpace: "pre-wrap",
        fontFamily: "inherit",
        fontSize: 14,
        margin: 0
    }
};
