Phase 1: The "Brain" (Days 1-3)
Goal: Create a Node.js server that can receive a text prompt and get a structured interview response from Gemini.

Tech: Node.js, Express, Google Generative AI SDK.

Engineering Flex: Prompt Engineering (System Instructions) to force Gemini to act like a strict interviewer, not a helpful assistant.

Phase 2: The "Context" (Days 4-7)
Goal: Give the brain memory. The AI needs to read your resume and the Job Description (JD).

Tech: pdf-parse (to read PDFs), Vector Logic (Basic similarity matching).

Engineering Flex: RAG (Retrieval Augmented Generation). Instead of pasting the resume every time, we parse it once and feed relevant parts to Gemini dynamically.

Phase 3: The "Ears & Mouth" (Days 8-12)
Goal: Turn text into voice and voice into text.

Tech: Deepgram API (Best free tier for speech-to-text) + WebSockets.

Engineering Flex: Real-time Streaming. Handling audio chunks so the AI answers while you are still finishing your sentence (low latency).

Phase 4: The "Face" (Days 13-16)
Goal: A clean Next.js Frontend to visualize the interview.

Tech: React, Tailwind, Audio Visualization (moving bars when AI speaks).