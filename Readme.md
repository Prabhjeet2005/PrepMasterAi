# PrepMasterAi 🎙️🤖
**Dual-Device AI Proctoring & Mock Interview Engine**

*🏆 2nd Position Winner - HackX Hackathon*

PrepMasterAi is a highly scalable, real-time AI interview platform engineered to simulate high-pressure technical interviews. By offloading complex video analysis to the client edge and utilizing a synchronized dual-device architecture, the system provides zero-latency proctoring and seamless conversational AI interactions without server-side processing bottlenecks.

---

## ✨ Core Features & Architecture

* **📱 Synchronized Dual-Device Proctoring:** Engineered a real-time pairing system utilizing `Socket.io` and WebRTC, allowing users to use their mobile device as a dedicated camera while taking the interview on their primary machine. 
* **⚡ Edge-Computed Video Analysis:** Offloaded 100% of the video processing overhead to the client edge. This eliminates massive server-side computing costs and ensures real-time anomaly detection without lagging the interview UI.
* **🛡️ Fault-Tolerant Audio Streaming:** Built a robust, real-time speech-to-text pipeline utilizing the Deepgram SDK. Implemented a custom packet-buffering queue to achieve **0% speech data loss** during WebSocket connection handshakes.
* **🧠 LLM-Powered Interview Engine:** Integrates the Google Gemini and Groq APIs to dynamically generate contextual, technical interview questions and evaluate candidate responses in real-time based on the transcribed audio stream.
* **☁️ Optimized Database Payload Routing:** Intercepts massive Base64 proctoring image data and streams it directly to Cloudinary via the backend. This architectural decision reduces MongoDB document payload sizes by over 95%, drastically improving the efficiency of the recruiter dashboard.
* **🐳 Docker Containerization:** Fully containerized microservice architecture using Docker and Docker Compose, ensuring 100% environment consistency across local development and production deployments.

---

## 🛠️ Technical Stack

### Frontend (Next.js Edge)
* **Framework:** Next.js (React)
* **Real-Time Communication:** Socket.io-client, WebRTC API
* **State Management:** React Context API
* **Styling:** Tailwind CSS

### Backend & Database (Node.js)
* **Runtime:** Node.js
* **Framework:** Express.js
* **WebSockets:** Socket.io (Bi-directional event routing)
* **Database:** MongoDB (Mongoose ODM)

### Infrastructure & External APIs
* **Audio Transcription:** Deepgram SDK (WebSockets)
* **LLM Engines:** Google Gemini API, Groq API
* **Media Storage:** Cloudinary
* **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started

### Prerequisites
To run this application locally, ensure you have the following installed:
* [Node.js](https://nodejs.org/en/) (v20 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop) (For containerized setup)
* A MongoDB cluster URI

### 🐳 Docker Containerization (Recommended)

To spin up the entire synchronized application in isolated containers:

1. Ensure Docker Desktop is running.
2. Clone the repository and navigate to the root directory.
3. Run the orchestration command:
   ```
   docker compose up --build
   ```
4. The application will map to your local host:
  - Frontend (Next.js): http://localhost:3000
  - Backend (Node.js): http://localhost:5001

### Local Development (Standard Setup)
1. Install Backend Dependencies
```
cd server
npm install
```

2. Install Frontend Dependencies
```
cd ../client
npm install --legacy-peer-deps
```

3. Start the Development Servers

Open two terminal windows:
  - Terminal 1 (Backend): ```cd server && npm start```
  - Terminal 2 (Frontend): ```cd client && npm run dev```

### 🔐 Environment Variables
To run this project, you must create the following environment files and populate them with your own API keys. Do not commit these files to version control.

1. Backend (/server/.env)
```
PORT=5001
MONGO_URI='your_mongodb_connection_string'
DEEPGRAM_API_KEY='your_deepgram_api_key'
GEMINI_API_KEY='your_google_gemini_key'
GROQ_API_KEY='your_groq_api_key'
CLOUDINARY_CLOUD_NAME='your_cloud_name'
CLOUDINARY_API_KEY='your_cloudinary_api_key'
CLOUDINARY_API_SECRET='your_cloudinary_secret'
FRONTEND_URL='http://localhost:3000'
```

2. Frontend (/client/.env.local)
```
NEXT_PUBLIC_SERVER_URL='http://localhost:5001'
NEXT_PUBLIC_SOCKET_URL='http://localhost:5001'
```

## 📱 Mobile Camera Proctoring (Local Network Testing)

PrepMasterAi utilizes WebRTC and `navigator.mediaDevices.getUserMedia()` for the dual-device camera synchronization. Modern browsers strictly block camera access on `http://` protocols unless the domain is `localhost`. 

To test the mobile proctoring feature across your local Wi-Fi network, you must align your IP address and bypass browser security constraints.

**Step 1: Identify your Local IPv4 Address**
Find your machine's local IP address (e.g., `192.168.1.8`). 
* *Note: If your router uses dynamic DHCP, this IP may change periodically. You must update the following steps whenever your IP changes.*

**Step 2: Update Environment Variables**
Update your Next.js `.env.local` file to point to your network IP rather than localhost:
\`\`\`env
NEXT_PUBLIC_SERVER_URL='http://192.168.1.8:8000'
NEXT_PUBLIC_SOCKET_URL='http://192.168.1.8:8000'
\`\`\`
*(Restart your Docker containers after updating this file).*

**Step 3: Allow Insecure Origins in Chrome**
Because you are accessing the site via `http://192.168.1.8`, Chrome will block the camera on both your laptop and your mobile device. You must explicitly whitelist your IP.

1. Open Google Chrome on **both your Laptop and your Android device**.
2. Type `chrome://flags` in the URL bar.
3. Search for: **Insecure origins treated as secure**
4. Enable the flag and paste your exact frontend address in the text box (e.g., `http://192.168.1.8:3000`).
5. Click **Relaunch** at the bottom of the screen.

You can now navigate to `http://192.168.1.8:3000` on both devices, log in, and the WebRTC WebSocket handshake will successfully synchronize your mobile camera.
