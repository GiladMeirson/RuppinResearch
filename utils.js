import Question from "./BL/Question.js";
import { AskGemini } from "./gemini.js";
import { AskOpenAI } from "./openai.js";
import { AskGrok } from "./grok.js";
import { askClaude } from "./claude.js";
import { askDeepSeek } from "./deepseek.js";
import fs from "fs";
import path from "path";

// Function to clean the string
export function cleanJsonString(str) {
  // Remove any potential hidden characters at the start of the string
  str = str.replace(/^\uFEFF/, "");
  // Remove any potential formatting characters
  str = str.replace(/^```json\s*/, "").replace(/```$/, "");
  str = str.replace("```", "");
  // Trim whitespace
  return str.trim();
}

export function transformData(data, modelName) {
  return data.map((res) => ({
    QuestionID: res.question_id,
    AnswerID: res.answer_id,
    AnswerIndex: res.answer_index,
    HumanRank: null, // need to get it in the SQL
    AiRank: res.rating,
    AiExplnation: res.reason,
    modelName: modelName,
    temp: res.temperature,
  }));
}

export function transformModelData(inputArray) {
  console.log("Transforming model data:", inputArray);
  const map = new Map();

  inputArray.forEach((item) => {
    const key = `${item.Model1}vs${item.Model2}`;
    if (!map.has(key)) {
      map.set(key, { alignments: [], totalCount: 0 });
    }

    const entry = map.get(key);
    entry.alignments.push({
      AlignmentLevel: item.AlignmentLevel,
      Percentage: item.Percentage,
      Count: item.Count,
    });
    entry.totalCount += item.Count; // Sum the counts
  });

  const resultArray = Array.from(map.entries()).map(([key, value]) => {
    const [Model1, Model2] = key.split("vs");
    return {
      Model1,
      Model2,
      Alignments: value.alignments,
      TotalCount: value.totalCount, // Total count for this model pair
    };
  });

  return resultArray;
}
export function transformQuestionsAndAnswers(data) {
  const questionsMap = Question.createQuestionsMap(data);
  return Array.from(questionsMap.values());
}

export const AiSwitcher = (inputText, modelName, temp) => {
  switch (modelName) {
    case "gpt-5":
    case "gpt-4o":
    case "gpt-3.5-turbo":
    case "o1":
      return AskOpenAI(inputText, temp, modelName);
    case "claude-sonnet-4-20250514":
    case "claude-3-5-sonnet-20241022":
      return askClaude(inputText, modelName, temp);
    case "grok-4-0709":
    case "grok-3":
      return AskGrok(inputText, temp, modelName);
    case "deepseek-chat":
    case "deepseek-coder":
      return askDeepSeek(inputText, modelName, temp);
    case "gemini-2.5-flash":
    case "gemini-1.5-flash":
      return AskGemini(inputText, temp, modelName);
    default:
      throw new Error(`Unsupported model: ${modelName}`);
  }
};

export const WriteErrorToErrFile = (
  err,
  title = "Error",
  status = null,
  modelDetails = null
) => {
  try {
    const logsDir = path.join(process.cwd(), "logs");
    const errorFile = path.join(logsDir, "err.txt");

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    const separator = "*".repeat(49);

    let errorMessage = "";
    let errorStatus = status || "Unknown";

    // Handle different error types
    if (err instanceof Error) {
      errorMessage = err.message;
      if (err.stack) {
        errorMessage += `\nStack trace: ${err.stack}`;
      }
    } else if (typeof err === "object") {
      errorStatus = err.status || err.statusCode || errorStatus;
      errorMessage = err.message || JSON.stringify(err, null, 2);
    } else if (err) {
      errorMessage = String(err);
    }

    // Format model details if provided
    let modelInfo = "";
    if (modelDetails) {
      modelInfo = "\nModel Details:";
      if (modelDetails.model) {
        modelInfo += `\nModel Name: ${modelDetails.model}`;
      }
      if (modelDetails.runID) {
        modelInfo += `\nRun ID: ${modelDetails.runID}`;
      }
    }

    const logEntry = `
${separator}
${timestamp}
${title}
Status: ${errorStatus}${modelInfo}
${errorMessage}
${separator}

`;

    // Append to error log file
    fs.appendFileSync(errorFile, logEntry, "utf8");
    console.log(`Error logged to: ${errorFile}`);
  } catch (logError) {
    console.error("Failed to write error to log file:", logError);
  }
};
