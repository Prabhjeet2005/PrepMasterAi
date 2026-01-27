// Temporary RAM

let chatSessions = {}; // Stores the active Gemini chat sessions

module.exports = {
    getSession: (id) => chatSessions[id],
    setSession: (id, session) => { chatSessions[id] = session; },
    deleteSession: (id) => { delete chatSessions[id]; }
};