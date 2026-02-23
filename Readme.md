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




# Phase 2: Phases
Phase 2.1: Build the Admin Panel & Database schema to create MCQs and DSA questions.

Phase 2.2: Integrate the Monaco Code Editor and hook it up to a compiler API (Judge0) so a user can actually solve a DSA question and pass/fail test cases.

Phase 2.3: Build the basic Proctoring Engine (Tab switching detection and simple laptop webcam recording).

Phase 2.4: The Grand Finale—Multi-device QR code pairing and AI hand/face tracking.






1. The Laptop (Primary Node)
Camera: Active (Front-facing).

Task 1 (Liveness): Runs lightweight Face Detection to ensure exactly 1 face is looking at the screen.

Task 2 (Identity Generation): Takes a snapshot of the face, generates a Face Embedding (a 128-dimensional mathematical array representing the user's facial features), and securely sends this embedding to the WebSocket server.

2. The Mobile Phone (Secondary Node)
Positioning: Placed on a stand to the side, capturing the user's side-profile/face, their hands, the desk, and the laptop screen.

Task 1 (Object Detection): Runs a lightweight object model (like COCO-SSD) to scan for the class "cell phone".

Task 2 (Hand Tracking): Runs a hand model (like MediaPipe Hands) to ensure both hands are visible and accounted for.

Task 3 (Identity Verification): Runs Face Recognition. It generates an embedding of the face it sees, asks the WebSocket server for the Laptop's embedding, and calculates the mathematical distance between them. If they don't match, it throws a strike!

3. The WebSocket Server (The Bridge)
Creates a secure "Room" using the Assessment ID and User ID.

The laptop displays a QR code containing the URL to join this specific room.

The phone scans it, joins the room, and the devices can now talk to each other in real-time. If the phone detects a violation, it tells the server, the server tells the laptop, and the laptop drops the "Red Screen of Death" on the candidate.

# CHALLENGES
1. Mobile Browser Overheating: Running Face Recognition, Hand Tracking, and Object Detection simultaneously on a mobile browser at 30 FPS will literally drain the battery in 10 minutes and throttle the phone.

- Our Solution: We will use Polling (Throttling) for the ML models. The phone's camera will show 30 FPS video, but the AI will only analyze a frame every 2 seconds. This saves massive amounts of memory.

2. Screen Sleep: Phones automatically turn off their screens after 30 seconds of inactivity. If the screen sleeps, the browser pauses the camera and the ML models.

- Our Solution: We will use the browser's WakeLock API on the mobile page to force the screen to stay awake for the duration of the test.

3. Side-Profile Recognition: Face recognition struggles if the laptop gets a straight-on view and the phone gets a 90-degree side profile.

- Our Solution: The phone placement instructions must tell the user to place the phone at a ~45-degree angle so at least one eye and the nose are clearly visible to the phone's camera.


# TODO: Exact PDF Store For Which Mock Interview Took Place
# 1 User Attempt Assessment once
# TODO: Add Same Face Check in Phone
# Headphone/ Earphone Detection


