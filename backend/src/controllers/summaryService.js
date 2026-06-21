// backend/src/controllers/summaryService.js
// New file. Talks to Groq's free-tier, OpenAI-compatible chat completion API
// to summarize a meeting transcript. Swap GROQ_API_URL/model/key for any
// other OpenAI-compatible provider if you prefer.

// Node 18+ has global fetch built in. If you're on an older Node version,
// run: npm install node-fetch   and uncomment the line below.
// import fetch from "node-fetch";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * @param {Array<{userName: string, text: string}>} lines
 * @returns {Promise<string>} summary text
 */
export async function generateSummary(lines) {
    const transcriptText = lines
        .map((l) => `${l.userName}: ${l.text}`)
        .join("\n");

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content:
                        "You summarize meeting transcripts. Produce: 1) a short overview paragraph, 2) key discussion points as bullets, 3) action items as bullets with the responsible person if mentioned. Be concise and only use information present in the transcript."
                },
                {
                    role: "user",
                    content: `Here is the meeting transcript:\n\n${transcriptText}\n\nSummarize it.`
                }
            ],
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errBody}`);
    }

    const json = await response.json();
    return json.choices[0].message.content;
}
