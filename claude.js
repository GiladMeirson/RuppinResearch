import "dotenv/config";
import { Anthropic } from "@anthropic-ai/sdk";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function chatWithContext() {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: "אתה עוזר מועיל שעונה בעברית ומתמחה בפיתוח תוכנה.",
      messages: [
        {
          role: "user",
          content: "תוכל להסביר מה זה Promise ב-JavaScript?",
        },
      ],
    });

    console.log(message.content[0].text);
  } catch (error) {
    console.error(error);
  }
}

chatWithContext();
