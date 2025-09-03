import express from "express";
import bodyParser from "body-parser";
import compression from "compression";
import { AskGemini } from "./gemini.js";
import { AskOpenAI } from "./openai.js";
import { AskGrok } from "./grok.js";
import { askClaude } from "./claude.js";
import { askDeepSeek } from "./deepseek.js";
import { fileURLToPath } from "url";
import path from "path";
import cors from "cors";
import Pako from "pako";
import {
  transformData,
  cleanJsonString,
  AiSwitcher,
  WriteErrorToErrFile,
} from "./utils.js";
import dotenv from "dotenv";

import {
  executeSpInsertToExecution,
  getAllExecutionScores,
  InsertToQuestion,
  getAllQuestions,
  InsertToAnswer,
  InsertPromptToDB,
  getAllPrompts,
  getExecutionScoresWithRunIDs,
  getconsistencyModels,
  getdetailedConsistencyModel,
  getModelScores,
  getcoherencyBetweenModels,
  getDetailEachAnswerOfQuestRankCompare,
  GetAllBatchNames,
  GetAllRunIds,
} from "./DBservices.js";

//for .env file
dotenv.config();
// Assuming the existing code is in the same file or imported here
// Import the run function and any other necessary components

const app = express();
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use compression middleware
app.use(compression());

// Use raw body parser for the /insertAnswers route
app.use(
  "/insertAnswers",
  bodyParser.raw({ type: "application/octet-stream", limit: "100mb" })
);

// Increase the payload limit
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Use the cors middleware to allow access from any origin
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static("public"));

// POST route to receive a string and return a string using the run function
app.post("/AskAi", async (req, res) => {
  try {
    // Step 1: Validate input data
    const { inputText, runID, fullPromptObject, temp } =
      await validateInputData(req, res);
    if (!inputText || !runID || !fullPromptObject) return; // Response already sent in validation

    // Step 2: Call AI service
    const aiResult = await callAiService(inputText, req.body.model, temp, res);
    if (!aiResult) return; // Response already sent in AI service call

    // Step 3: Process AI response
    const execuationObj = await processAiResponse(
      aiResult,
      req.body.model,
      res
    );
    if (!execuationObj) return; // Response already sent in processing

    // Step 4: Execute database insertion
    const resultexecute = await executeDbInsertion(
      execuationObj,
      fullPromptObject,
      temp,
      runID,
      res
    );
    if (resultexecute === null) return; // Response already sent in DB execution

    // Success response
    res.status(200).json({
      success: true,
      resultexecute,
    });
  } catch (error) {
    console.error("Unexpected error in /AskAi:", error);
    res.status(500).json({
      success: false,
      errorName: "Unexpected Server Error",
      message: "An unexpected error occurred while processing your request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Helper function: Validate input data
async function validateInputData(req, res) {
  try {
    const inputText = req.body.text;
    const runID = req.body.RunId;
    const fullPromptObject = req.body.prompt;
    const temp = parseFloat(req.body.temp);

    // Check for missing required fields
    if (!inputText) {
      WriteErrorToErrFile(null, "Missing Input Text", 400, {
        model: req.body.model,
        runID: runID,
      });
      res.status(400).json({
        success: false,
        errorName: "Missing Input Text",
        message: "No text provided in the request",
      });
      return { inputText: null };
    }

    if (!runID) {
      WriteErrorToErrFile(null, "Missing Run ID", 400, {
        model: req.body.model,
        runID: runID,
      });
      res.status(400).json({
        success: false,
        errorName: "Missing Run ID",
        message: "No Run ID provided in the request",
      });
      return { inputText: null };
    }

    if (!fullPromptObject || !fullPromptObject.promptID) {
      WriteErrorToErrFile(null, "Missing Prompt Object", 400, {
        model: req.body.model,
        runID: runID,
      });
      res.status(400).json({
        success: false,
        errorName: "Missing Prompt Object",
        message: "No valid prompt object or prompt ID provided",
      });
      return { inputText: null };
    }

    if (isNaN(temp)) {
      WriteErrorToErrFile(null, "Invalid Temperature", 400, {
        model: req.body.model,
        runID: runID,
      });
      res.status(400).json({
        success: false,
        errorName: "Invalid Temperature",
        message: "Temperature must be a valid number",
      });
      return { inputText: null };
    }

    return { inputText, runID, fullPromptObject, temp };
  } catch (error) {
    WriteErrorToErrFile(error, "Input Validation Error", 400, {
      model: req.body.model,
      runID: runID,
    });
    console.error("Error validating input data:", error);
    res.status(400).json({
      success: false,
      errorName: "Input Validation Error",
      message: "Failed to validate input data",
      error: error.message,
    });
    return { inputText: null };
  }
}

// Helper function: Call AI service
async function callAiService(inputText, model, temp, res) {
  try {
    const aiResult = await AiSwitcher(inputText, model, temp);

    if (!aiResult) {
      WriteErrorToErrFile(null, "AI Service Error", 502, { model: model });
      res.status(502).json({
        success: false,
        errorName: "AI Service Error",
        message: "AI service returned empty response",
      });
      return null;
    }

    console.log(`AI Result from ${model}:`, aiResult, typeof aiResult);
    return aiResult;
  } catch (error) {
    console.error("Error calling AI service:", error);

    // Check for specific AI service errors
    if (
      error.message.includes("rate limit") ||
      error.message.includes("quota")
    ) {
      WriteErrorToErrFile(error, "AI Service Rate Limit", 429, {
        model: model,
      });
      res.status(429).json({
        success: false,
        errorName: "AI Service Rate Limit",
        message: "AI service rate limit exceeded. Please try again later.",
      });
    } else if (
      error.message.includes("authentication") ||
      error.message.includes("unauthorized")
    ) {
      WriteErrorToErrFile(error, "AI Service Authentication Error", 401, {
        model: model,
      });
      res.status(401).json({
        success: false,
        errorName: "AI Service Authentication Error",
        message: "AI service authentication failed",
      });
    } else if (error.message.includes("timeout")) {
      WriteErrorToErrFile(error, "AI Service Timeout", 504, { model: model });
      res.status(504).json({
        success: false,
        errorName: "AI Service Timeout",
        message: "AI service request timed out",
      });
    } else {
      WriteErrorToErrFile(error, "AI Service Error", 502, { model: model });
      res.status(502).json({
        success: false,
        errorName: "AI Service Error",
        message: "Failed to get response from AI service",
        error: error.message,
      });
    }
    return null;
  }
}

// Helper function: Process AI response
async function processAiResponse(aiResult, model, res) {
  try {
    const resString = cleanJsonString(aiResult);

    if (!resString) {
      WriteErrorToErrFile(null, "AI Response Processing Error", 422, {
        model: model,
      });
      res.status(422).json({
        success: false,
        errorName: "AI Response Processing Error",
        message: "Failed to clean AI response string",
      });
      return null;
    }

    const resParsed = JSON.parse(resString);

    if (!resParsed) {
      WriteErrorToErrFile(null, "JSON Parsing Error", 422, { model: model });
      res.status(422).json({
        success: false,
        errorName: "JSON Parsing Error",
        message: "Failed to parse AI response as JSON",
      });
      return null;
    }

    const execuationObj = transformData(resParsed, model);

    if (!execuationObj || execuationObj.length === 0) {
      WriteErrorToErrFile(null, "Data Transformation Error", 422, {
        model: model,
      });
      res.status(422).json({
        success: false,
        errorName: "Data Transformation Error",
        message:
          "Failed to transform AI response data or no valid data to process",
      });
      return null;
    }

    return execuationObj;
  } catch (error) {
    WriteErrorToErrFile(error, "AI Response Processing Error", 422, {
      model: model,
    });
    console.error("Error processing AI response:", error);

    if (error instanceof SyntaxError) {
      res.status(422).json({
        success: false,
        errorName: "JSON Parsing Error",
        message: "AI response is not valid JSON format",
        error: error.message,
      });
    } else {
      res.status(422).json({
        success: false,
        errorName: "Response Processing Error",
        message: "Failed to process AI response",
        error: error.message,
      });
    }
    return null;
  }
}

// Helper function: Execute database insertion
async function executeDbInsertion(
  execuationObj,
  fullPromptObject,
  temp,
  runID,
  res
) {
  try {
    const resultexecute = await executeSpInsertToExecution(
      execuationObj,
      fullPromptObject.batchName,
      temp,
      fullPromptObject.userName,
      fullPromptObject.promptID,
      runID
    );

    if (!resultexecute) {
      WriteErrorToErrFile(null, "Database Insertion Error", 500, {
        model: fullPromptObject.modelName,
        runID: runID,
      });
      res.status(500).json({
        success: false,
        errorName: "Database Insertion Error",
        message: "Failed to insert execution data into database",
      });
      return null;
    }

    return resultexecute;
  } catch (error) {
    //WriteErrorToErrFile(error, "Database Insertion Error", 500);
    console.error("Error executing database insertion:", error);

    // Check for specific database errors
    if (
      error.message.includes("connection") ||
      error.message.includes("timeout")
    ) {
      WriteErrorToErrFile(error, "Database Connection Error", 503, {
        model: fullPromptObject.modelName,
        runID: runID,
      });
      res.status(503).json({
        success: false,
        errorName: "Database Connection Error",
        message: "Database connection failed or timed out",
      });
    } else if (
      error.message.includes("constraint") ||
      error.message.includes("duplicate")
    ) {
      WriteErrorToErrFile(error, "Database Constraint Error", 409, {
        model: fullPromptObject.modelName,
        runID: runID,
      });
      res.status(409).json({
        success: false,
        errorName: "Database Constraint Error",
        message: "Data violates database constraints or already exists",
      });
    } else if (
      error.message.includes("permission") ||
      error.message.includes("access")
    ) {
      WriteErrorToErrFile(error, "Database Permission Error", 403, {
        model: fullPromptObject.modelName,
        runID: runID,
      });
      res.status(403).json({
        success: false,
        errorName: "Database Permission Error",
        message: "Insufficient permissions to perform database operation",
      });
    } else {
      WriteErrorToErrFile(error, "Database Error", 500, {
        model: fullPromptObject.modelName,
        runID: runID,
      });
      res.status(500).json({
        success: false,
        errorName: "Database Error",
        message: "Failed to execute database operation",
        error: error.message,
      });
    }
    return null;
  }
}

app.post("/SavePrompt", async (req, res) => {
  try {
    const promptObject = req.body; // Assuming the question object is sent in the body
    if (!promptObject) {
      return res.status(400).send("No prompt object provided");
    }
    const result = await InsertPromptToDB(promptObject);
    res.json({ result });
  } catch (error) {
    console.error("Error inserting Prompt:", error);
    res.status(500).send("Internal Server Error Prompt");
  }
});

// POST route to receive a question object and insert it into the database
app.post("/insertExecuation", async (req, res) => {
  try {
    const questionObject = req.body; // Assuming the question object is sent in the body
    if (!questionObject) {
      return res.status(400).send("No question object provided");
    }
    const result = await executeSpInsertToExecution(questionObject); // Use the provided function to insert the question object
    res.json({ result });
  } catch (error) {
    WriteErrorToErrFile(error, "Database Insertion Error", 500);
    console.error("Error inserting question:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/insertQuestions", async (req, res) => {
  try {
    const questionObjects = req.body; // Assuming the question object is sent in the body
    if (!questionObjects) {
      return res.status(400).send("No question object provided");
    }
    const result = await InsertToQuestion(questionObjects); // Use the provided function to insert the question object
    res.json({ result });
  } catch (error) {
    console.error("Error inserting question:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/insertAnswers", async (req, res) => {
  try {
    // Decompress the data using pako
    const decompressed = Pako.ungzip(req.body, { to: "string" });

    // Parse the decompressed JSON
    const answersObjects = JSON.parse(decompressed);

    if (!answersObjects) {
      return res.status(400).send("No answers object provided");
    }
    console.log("answersObjects", answersObjects);
    const result = await InsertToAnswer(answersObjects); // Use the provided function to insert the question object
    res.json({ result });
  } catch (error) {
    console.error("Error inserting question:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/Login", async (req, res) => {
  try {
    const user = req.body;
    if (!user) {
      return res.status(400).send("No user object provided");
    }

    if (
      (user.username == process.env.USER2 ||
        user.username == process.env.USER1) &&
      user.password == process.env.APP_PASSWORD
    ) {
      res.json({ result: "success", user: user });
    } else {
      res.json({ result: "failed", user: user });
    }
  } catch (error) {
    console.error("Failed to login to server: ", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getAllBatchNames", async (req, res) => {
  try {
    const batchNames = await GetAllBatchNames(); // Use the provided function to get all batch names
    res.json({ batchNames });
  } catch (error) {
    console.error("Error retrieving batch names:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getAllRunIds", async (req, res) => {
  try {
    const runIds = await GetAllRunIds(); // Use the provided function to get all run IDs
    res.json({ runIds });
  } catch (error) {
    console.error("Error retrieving run IDs:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getAllPrompt", async (req, res) => {
  try {
    const promptsList = await getAllPrompts(); // Use the provided function to get all prompts
    res.json({ promptsList });
  } catch (error) {
    console.error("Error retrieving prompts:", error);
    res.status(500).send("Internal Server Error getAllPrompt");
  }
});

// GET route to retrieve all execution scores from the database
app.get("/getAllExecutionScores", async (req, res) => {
  try {
    const scores = await getAllExecutionScores(); // Use the provided function to get all execution scores
    res.json({ scores });
  } catch (error) {
    console.error("Error retrieving scores:", error);
    res.status(500).send("Internal Server Error");
  }
});

//GET ALL HISTORY from the database
app.get("/getHistory", async (req, res) => {
  try {
    const history = await getExecutionScoresWithRunIDs(); // Use the provided function to get all execution scores
    res.json({ history });
  } catch (error) {
    console.error("Error retrieving History:", error);
    res.status(500).send("Internal Server Error", error);
  }
});

//GET ALL MODEL SCORES from the database
/////////////// this 2 methods is post because more easy pass the params in the body
app.post("/getModelScores", async (req, res) => {
  try {
    //console.log('req.query',req.body);
    const domain = req.body.domain;
    const models = await getModelScores(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });
  } catch (error) {
    console.error("Error retrieving models stats: getModelScores", error);
    res
      .status(500)
      .send(
        "Internal Server Error : Error retrieving models stats: getModelScores",
        error
      );
  }
});

app.post("/getConsistencyModels", async (req, res) => {
  const domain = req.body.domain;
  try {
    const models = await getconsistencyModels(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });
  } catch (error) {
    console.error("Error retrieving models stats: getconsistencyModels", error);
    res.status(500).send("Internal Server Error", error);
  }
});

app.post("/getCoherencyBetweenModels", async (req, res) => {
  const domain = req.body.domain;
  try {
    const models = await getcoherencyBetweenModels(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });
  } catch (error) {
    console.error(
      "Error retrieving models stats: getcoherencyBetweenModels",
      error
    );
    res.status(500).send("Internal Server Error", error);
  }
});
/////////////////
app.get("/getDetailsConsistencyModels", async (req, res) => {
  try {
    const models = await getdetailedConsistencyModel(); // Use the provided function to get stats about consistency of model
    res.json({ models });
  } catch (error) {
    console.error(
      "Error retrieving models stats: getdetailedConsistencyModel",
      error
    );
    res.status(500).send("Internal Server Error", error);
  }
});

// GET route to retrieve all questions from the database
app.get("/getAllQuestions", async (req, res) => {
  try {
    const questions = await getAllQuestions(); // Use the provided function to get all questions
    //console.log('in the controller ',questions)
    res.json({ questions });
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).send("Internal Server Error");
  }
});

//GET detail about RankCompare for each Answer of quest in runid
app.post("/getDetailEachAnswerOfQuestRankCompare", async (req, res) => {
  try {
    const runID = req.body.runID;
    const questionID = req.body.questionID;
    const answers = await getDetailEachAnswerOfQuestRankCompare(
      questionID,
      runID
    ); // Use the provided function to get all questions
    res.json({ answers });
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Optionally, explicitly serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "../pages/Login.html"));
});

// Start the server
app.listen(port, () => {
  console.log("__dirname", __dirname);
  console.log(`Server running at http://localhost:${port}`);
});
