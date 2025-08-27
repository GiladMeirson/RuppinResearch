import 'dotenv/config';
import OpenAI from "openai";

const Grok_API_KEY = process.env.Grok_API_KEY;


const client = new OpenAI({
    apiKey: Grok_API_KEY,
    baseURL: "https://api.x.ai/v1",
});

export const AskGrok = async (inputText,temp=0,modelName="grok-3")=>{
    const completion = await client.chat.completions.create({
        model: modelName,
        temperature: temp,
        messages: [
            {
                role: "system",
                content:
                    "You are an AI that helps us in research about answer ratings for questions from the stack exchange site your task is to rate the answers to questions and your output is JSON only",
            },
            {
                role: "user",
                content: inputText,
            },
        ],
    });
    
    //console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content
}

