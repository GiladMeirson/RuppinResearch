import "dotenv/config";
import { Anthropic } from "@anthropic-ai/sdk";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(
  inputText,
  modelName = "claude-sonnet-4-20250514",
  temp = 0
) {
  try {
    const message = await anthropic.messages.create({
      model: modelName,
      max_tokens: 1500,
      temperature: temp,
      system:
        "You are an AI that helps us in research about answer ratings for questions from the stack exchange site your task is to rate the answers to questions and your output is JSON only",
      messages: [
        {
          role: "user",
          content: inputText,
        },
      ],
    });

    //console.log(message.content[0].text);
    return message.content[0].text;
  } catch (error) {
    console.error(error);
  }
}
