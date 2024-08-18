import 'dotenv/config';
import OpenAI from "openai";

const apiKeyEnv = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKeyEnv,
});

export async function AskOpenAI(inputText,temp=1,modelN) {
  

  const response = await openai.chat.completions.create({
    model: modelN,
    messages: [
      {
        "role": "system",
        "content": [
          {
            "type": "text",
            "text": "You are an AI that helps us in research about answer ratings for questions from the stack exchange site your task is to rate the answers to questions and your output is JSON only"
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": inputText
          }
        ]
      }
    ],
    temperature: temp,
    max_tokens: 256,
    top_p: 0.01,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  
  //console.log(response);
  console.log(response.choices[0].message.content);
  console.log(response.usage);
  return {
    text: response.choices[0].message.content,
    usage:response.usage
  }

}

