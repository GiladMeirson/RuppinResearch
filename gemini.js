/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 *
 * See the getting started guide for more information
 * https://ai.google.dev/gemini-api/docs/get-started/node
 */

// const {
//     GoogleGenerativeAI,
//     HarmCategory,
//     HarmBlockThreshold,
//   } = require("@google/generative-ai");
  import 'dotenv/config';
  import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
  
  //console.log("GEMINI_API_KEY:", process.env.GOOGLE_GEMINI_KEY);


 

  
  const apiKey = process.env.GOOGLE_GEMINI_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    system_instruction : "You are an AI that helps us in research about answer ratings for questions from the stack exchange site your task is to rate the answers to questions and your output is JSON only",

  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };
  
  export async function AskGemini(inputText,temp=1) {


    generationConfig.temperature = temp;
    const chatSession = model.startChat({
      generationConfig,
   // safetySettings: Adjust safety settings
   // See https://ai.google.dev/gemini-api/docs/safety-settings
      history: [
        // {
        //   role: "user",
        //   parts: [
        //     {text: "hey"},
        //   ],
        // },
        // {
        //   role: "model",
        //   parts: [
        //     {text: "Hey there! What can I do for you today? \n"},
        //   ],
        // },
      ],
    });
  
    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
    //console.log(result.response.text());
  }
  


