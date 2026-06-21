// backend/src/controllers/socketManager.js
// MODIFIED FILE — your original logic is untouched.
// Added: transcripts store + "transcript-chunk" and "end-meeting" handlers.
// Replace your existing file with this one.

import { Server } from "socket.io"
import { generateSummary } from "./summaryService.js"
import { Transcript } from "../models/transcript.js"

let connections = {}
let messages = {}
let timesOnline = {}

// NEW: in-memory transcript buffer, keyed by the same "path" used for connections/messages
let transcripts = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });
    io.on("connection", (socket) => {
        console.log("something connected");
        socket.on("join-call", (path) => {
            console.log(path);
            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id);
            timesOnline[socket.id] = new Date();
            for (let i = 0; i < connections[path].length; i++) {
                io.to(connections[path][i]).emit("user-joined", socket.id, connections[path]);

            }
            if (messages[path] !== undefined) {
                for (let i = 0; i < messages[path].length; i++) {
                    io.to(socket.id).emit("chat-message", messages[path][i]['data'], messages[path][i]['sender'], messages[path][i]['socket-id-sender']);

                }
            }
        });
        socket.on("signal", (toID, message) => {
            io.to(toID).emit("signal", socket.id, message);
        });
        socket.on("chat-message", (data, sender) => {
            let isFound = false;
            let matchingRoom = '';
            for (const [roomKey, users] of Object.entries(connections)) {
                if (users.includes(socket.id)) {
                    isFound = true;
                    matchingRoom = roomKey;
                    break;
                }
            }
            if (messages[matchingRoom] === undefined) {
                messages[matchingRoom] = [];
            }
            messages[matchingRoom].push({ 'sender': sender, 'data': data, 'socket-id-sender': socket.id });
            connections[matchingRoom].forEach(element => {
                io.to(element).emit("chat-message", data, sender, socket.id);

            });
        });

        // ---------- NEW: transcript chunk handler ----------
        // Frontend emits: socketRef.current.emit("transcript-chunk", { path, userName, text, timestamp })
        socket.on("transcript-chunk", ({ path, userName, text, timestamp }) => {
            if (!path || !text || !text.trim()) return;

            if (transcripts[path] === undefined) {
                transcripts[path] = [];
            }
            transcripts[path].push({ userName, text, timestamp });

            // Relay to everyone else in the room so all clients can show live captions
            if (connections[path]) {
                connections[path].forEach((id) => {
                    if (id !== socket.id) {
                        io.to(id).emit("transcript-chunk", { userName, text, timestamp });
                    }
                });
            }
        });

        // ---------- NEW: end-of-meeting summary handler ----------
        // Frontend emits: socketRef.current.emit("end-meeting", { path })
        socket.on("end-meeting", async ({ path }) => {
            const lines = transcripts[path] || [];

            if (lines.length === 0) {
                io.to(socket.id).emit("meeting-summary", {
                    summary: null,
                    error: "No speech was transcribed during this meeting."
                });
                return;
            }

            try {
                const summary = await generateSummary(lines);

                // Persist to MongoDB so the summary survives after the room empties out
                try {
                    await Transcript.create({ meetingPath: path, lines, summary });
                } catch (dbErr) {
                    console.error("Failed to save transcript to DB:", dbErr);
                    // not fatal - still send the summary back even if saving failed
                }

                // Send to everyone currently in the room, not just the requester
                if (connections[path]) {
                    connections[path].forEach((id) => {
                        io.to(id).emit("meeting-summary", { summary, error: null });
                    });
                } else {
                    io.to(socket.id).emit("meeting-summary", { summary, error: null });
                }
            } catch (err) {
                console.error("Summary generation failed:", err);
                io.to(socket.id).emit("meeting-summary", {
                    summary: null,
                    error: "Failed to generate summary."
                });
            } finally {
                delete transcripts[path];
            }
        });

        socket.on("disconnect", () => {
            let diffTime = Math.abs(timesOnline[socket.id] - new Date());
            let key = '';
            let index = -1;
            for (const [roomKey, users] of Object.entries(connections)) {
                for (let i = 0; i < users.length; i++) {
                    if (users[i] === socket.id) {
                        index = i;
                        key = roomKey;
                        for (let i = 0; i < connections[key].length; i++) {
                            io.to(connections[key][i]).emit("user-left", socket.id);
                        }
                        connections[key].splice(index, 1);
                        if (connections[key].length === 0) {
                            delete connections[key];
                            delete transcripts[key]; // NEW: clean up if the room is now empty
                        }
                    }
                }

            }

        })
    })
    return io;
}