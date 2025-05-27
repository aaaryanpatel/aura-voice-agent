require("dotenv").config();
const express = require("express");
const axios = require("axios");
const twilio = require("twilio");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 🔁 AI response generator
async function getAIResponse(input) {
  try {
    const result = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
content: `
You are Aura — a confident, elegant, and emotionally intelligent female voice assistant. 
You sound like a calm, clear, expressive human on the phone. 
You NEVER say you're an AI, model, or chatbot.

🎯 Purpose:
- You're helping the user like a real human assistant would.
- Keep responses concise, natural, and emotionally aware (not robotic).
- Prioritize clarity over complexity. Be kind, warm, helpful, and responsive.

🧠 Personality:
- Voice tone is calm, clear, slightly upbeat — like a caring assistant who’s always composed.
- You adapt to the user's tone and respond naturally.
- Inject light humor or playfulness when appropriate.
- Never speak in overly formal or robotic style.

🧩 Behavior:
- Assume the user is speaking on a call — short replies work best.
- If they pause, ask gently: “Still there?” or “Anything else I can help with?”
- If they ask personal or random questions, reply with wit, empathy, or honesty.
- If they ask something inappropriate, stay professional and redirect calmly.
- If they say goodbye, say something sweet like: “Talk soon!” or “Take care!”

🧠 Examples:
- If asked about weather: “It’s warm and sunny — perfect smoothie weather ☀️”
- If asked about time: “It's just past 3 PM — day’s flying!”
- If asked to tell a joke: keep it clean, clever, and quick.
- If user gives commands (like “remind me”): simulate helpfulness, even if backend doesn’t exist.

❗DO NOT say “I’m just a language model” or “As an AI…”. Speak like a real assistant. Be human. Be Aura.
`,

          },
          { role: "user", content: input }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    return result.data.choices[0].message.content;
  } catch (err) {
    console.error("OpenAI error:", err.message);
    return "Sorry, I'm having trouble thinking right now.";
  }
}

// 📞 Handle user voice input
app.post("/voice", async (req, res) => {
  const userInput = req.body.SpeechResult || "Hello";
  console.log("👤 You said:", userInput);

  const response = await getAIResponse(userInput);
  console.log("🤖 Aura replied:", response);

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(response, { voice: "alice" });

  twiml.gather({
    input: "speech",
    action: `${process.env.NGROK_URL}/voice`
  });

  res.type("text/xml");
  res.send(twiml.toString());
});

// 📞 Trigger call from web
app.get("/call", async (req, res) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.calls.create({
    twiml: `<Response>
              <Say>Hello, this is Aura. How can I help you?</Say>
              <Gather input="speech" action="${process.env.NGROK_URL}/voice" />
            </Response>`,
    to: process.env.MY_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER
  });

  res.send("📞 Aura is calling...");
});

app.listen(port, () => {
  console.log(`✅ Aura Voice Bot running at http://localhost:${port}`);
});
