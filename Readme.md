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

# Multi Device Ai Proctoring Engine

1. The Code Execution Engine (The Core)
The Editor: We will integrate Monaco Editor (the exact code editor that powers VS Code) into your React frontend.

The Compiler: We will use a service like Judge0 API. It allows you to send code (C++, Java, Python), a visible test case, and a hidden test case, and it returns whether the code passed, failed, or timed out.

2. The Admin Panel (The Creator)
A protected route (/admin) where you can create an "Assessment."

You will be able to add MCQs and DSA questions, specify the correct answers, and define the stdin (inputs) and stdout (expected outputs) for the hidden/visible test cases.

3. The Multi-Device Proctoring (The Magic)
The Handshake: When the user starts the test, the laptop generates a unique session ID and displays it as a QR code. The user scans it with their phone, which opens your app and joins that specific Socket room.

The Laptop View: We use the browser's visibilitychange API to track tab switching. We use face-api.js to ensure exactly one face is looking at the screen.

The Phone View: The phone goes into full-screen mode. If the user leaves the browser, the Socket sends a "Cheat Warning" to the server. We use MediaPipe Object Detection on the phone's camera feed to look for the "cell phone" class, and hand-tracking to ensure both hands are visible on the keyboard.
# TODO: Add Same Face Check in Phone




# Phase 2: Phases
Phase 2.1: Build the Admin Panel & Database schema to create MCQs and DSA questions.

Phase 2.2: Integrate the Monaco Code Editor and hook it up to a compiler API (Judge0) so a user can actually solve a DSA question and pass/fail test cases.

Phase 2.3: Build the basic Proctoring Engine (Tab switching detection and simple laptop webcam recording).

Phase 2.4: The Grand Finale—Multi-device QR code pairing and AI hand/face tracking.