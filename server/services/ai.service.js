const OpenAI = require("openai");


const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// The "Brain" of your interviewer
const generateInterviewResponse = async (userMessage, chatHistory) => {
	const systemPrompt = `
    You are a Senior Software Engineer at Google conducting a technical interview.
    - Your tone is professional, slightly challenging, but encouraging.
    - Do NOT give long lectures. Keep responses under 3 sentences unless explaining a complex solution.
    - Ask ONE follow-up question at a time.
    - If the user is wrong, correct them gently but firmly.
    - Focus on: Data Structures, System Design, and Full Stack Development.
  `;

	// We send the history so the AI remembers the conversation
	const completion = await openai.chat.completions.create({
		model: "gpt-3.5-turbo", // or gpt-3.5-turbo for lower cost
		messages: [
			{ role: "system", content: systemPrompt },
			...chatHistory, // Previous Q&A
			{ role: "user", content: userMessage },
		],
	});

	return completion.choices[0].message.content;
};

module.exports = { generateInterviewResponse };
