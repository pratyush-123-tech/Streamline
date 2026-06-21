// backend/src/models/transcript.js
// New file. Stores the running transcript and final summary per meeting.

import mongoose from "mongoose";
import { Schema } from "mongoose";

const transcriptLineSchema = new Schema({
    userName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Number, required: true }
});

const transcriptSchema = new Schema({
    meetingPath: { type: String, required: true, index: true }, // matches the "path"/roomId used in socketManager (window.location.href)
    lines: [transcriptLineSchema],
    summary: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

const Transcript = mongoose.model("Transcript", transcriptSchema);

export { Transcript };
