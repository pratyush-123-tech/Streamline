import React, { useEffect, useRef, useState } from "react"
const server_url="http://localhost:8080";
import io, { connect } from "socket.io-client";
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
var connections = {};
import "./VideoCall.css"
import {
    Avatar, 
    Button,
    CssBaseline,
    TextField,
    FormControlLabel,
    Checkbox,
    Link,
    Grid,
    Box,
    Typography,
    Paper,
    IconButton,
    Badge
  } from '@mui/material';
const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}
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

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [showChat, setShowChat] = useState(false);
    const showChatRef = useRef(false);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([]);

    // ---------- transcription + summary state ----------
    const recognitionRef = useRef(null);
    const [interimText, setInterimText] = useState("");
    const [captions, setCaptions] = useState([]); // combined transcript: local + remote chunks, used for end-of-meeting screen only
    const meetingPathRef = useRef(""); // mirrors the "path" used in join-call (window.location.href)

    // ---------- NEW: end-of-meeting screen state ----------
    const [meetingEnded, setMeetingEnded] = useState(false); // controls the post-call screen
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
    const getPermisssions=async ()=>{
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                        console.log(localVideoref.current);
                        console.log(localVideoref.current.srcObject);
                    }
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
            setVideo(newState);
        }
    };
    
    let handleAudio = () => {
        const audioTrack = localVideoref.current?.srcObject?.getAudioTracks()[0];
        if (audioTrack) {
            const newState = !audioTrack.enabled;
            audioTrack.enabled = newState;
            setAudio(newState);

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
            meetingPathRef.current = window.location.href; // keep the room path for transcript/summary events
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
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

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

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

    // ---------- NEW: post-call screen ----------
    if (meetingEnded) {
        return (
            <div style={styles.endScreenWrap}>
                <div style={styles.endScreenCard}>
                    <h2 style={{ marginTop: 0 }}>Meeting Ended</h2>

                    <div style={styles.tabRow}>
                        <button
                            style={activeTab === "transcript" ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab("transcript")}
                        >
                            Show Transcription
                        </button>
                        <button
                            style={activeTab === "summary" ? styles.tabActive : styles.tab}
                            onClick={() => setActiveTab("summary")}
                        >
                            Show Summary
                        </button>
                    </div>

                    {activeTab === "transcript" && (
                        <div>
                            <div style={styles.contentBox}>
                                {captions.length === 0 && <p>No speech was transcribed during this meeting.</p>}
                                {captions.map((c, i) => (
                                    <p key={i} style={{ margin: "4px 0" }}>
                                        <strong>{c.userName}:</strong> {c.text}
                                    </p>
                                ))}
                            </div>
                            <Button variant="contained" onClick={downloadTranscriptAsTxt} style={{ marginTop: 12 }}>
                                Download Transcript (.txt)
                            </Button>
                        </div>
                    )}

                    {activeTab === "summary" && (
                        <div>
                            <div style={styles.contentBox}>
                                {summaryLoading && <p>Generating summary, please wait...</p>}
                                {summaryError && <p style={{ color: "red" }}>{summaryError}</p>}
                                {summary && <pre style={styles.summaryPre}>{summary}</pre>}
                            </div>
                            <Button
                                variant="contained"
                                onClick={downloadSummaryAsPdf}
                                disabled={!summary}
                                style={{ marginTop: 12 }}
                            >
                                Download Summary (.pdf)
                            </Button>
                        </div>
                    )}

                    <div style={styles.closeRow}>
                        <Button variant="outlined" onClick={() => navigate("/")}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
     
    return(
        <div>
            {askForUsername===true?
            <div>
                <h2>Connect to lobby</h2>
                <TextField id="outlined-basic" label="Username" value={username} variant="outlined" onChange={(e)=>setUsername(e.target.value)} />
                <Button variant="contained" onClick={connect}>Connect</Button>
                <div>
                    <video ref={localVideoref} autoPlay muted></video>
                </div>
            </div>:
            <div className="meetVideoContainer">
                <div className="buttonContainer">
                    <IconButton style={{color:"white"}} onClick={handleVideo}>
                        {video===true?<VideocamIcon/>:<VideocamOffIcon/>}
                    </IconButton>
                    <IconButton style={{color:"white"}} onClick={handleAudio}>
                        {audio===true?<MicIcon/>:<MicOffIcon/>}
                    </IconButton>
                    {screenAvailable===true?
                        <IconButton style={{color:"white"}} onClick={handleScreen}>
                            {screen===true?<ScreenShareIcon/>:<StopScreenShareIcon/>}
                        </IconButton>
                    :<div></div>}
                    <Badge badgeContent={newMessages} max={999} color="secondary">
                        <IconButton style={{color:"white"}} onClick={toggleChat}><ChatIcon/></IconButton>
                    </Badge>
                    <IconButton style={{color:"red"}} onClick={handleEndMeeting}>
                        <CallEndIcon/>
                    </IconButton>

                </div>
                <video className="userVideo" ref={localVideoref} autoPlay muted></video>
                <div className="allUserVideo">
                {videos.map((video)=>(
                     
                     <video
                         data-ref={video.socketId}
                         ref={ref=>{
                             if(ref && video.stream){
                                 ref.srcObject=video.stream
                             }
                         }}
                         autoPlay
                         muted
                     >

                     </video>
                  
             ))}
                </div>

                {/* live captions intentionally not shown during the call - still recorded in background for the end-of-meeting transcript */}

                {/* chat slide-in panel */}
                <div style={showChat ? styles.chatPanelOpen : styles.chatPanelClosed}>
                    <div style={styles.chatHeader}>
                        <div style={styles.chatHeaderTitle}>
                            <ChatIcon style={{ fontSize: 18, color: "#7aa6ff" }} />
                            <span>In-call messages</span>
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
                                <div
                                    key={i}
                                    style={isMine ? styles.chatRowMine : styles.chatRowOther}
                                >
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
                            placeholder="Send a message"
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
            }
            </div>
                 

        
    )
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
