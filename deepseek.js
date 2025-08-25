import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_KEY,
});

async function test_deepseek() {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "user", content: "Hello, who won the world series in 2020?" },
    ],
    model: "deepseek-chat",
  });

  console.log(completion.choices[0].message.content);
}

test_deepseek();
