import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_KEY,
});

export async function askDeepSeek(inputText, modelName = "deepseek-chat", temp = 0) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an AI that helps us in research about answer ratings for questions from the stack exchange site your task is to rate the answers to questions and your output is JSON only",
      },
      { role: "user", content: inputText },
    ],
    model: modelName,
    temperature: temp,
  });

  //console.log(completion.choices[0].message.content);
  return completion.choices[0].message.content;
}
