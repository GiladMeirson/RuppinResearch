import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { AskGemini } from './gemini.js';
import { AskOpenAI } from './openai.js';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import Pako from 'pako';
import { transformData, cleanJsonString } from './utils.js';
import dotenv from 'dotenv';

import 
{ 
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
  getcoherencyBetweenModels
} from './DBservices.js';

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
app.use('/insertAnswers', bodyParser.raw({ type: 'application/octet-stream', limit: '100mb' }));

// Increase the payload limit
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Use the cors middleware to allow access from any origin
app.use(cors());


// Serve static files from the 'public' directory
app.use(express.static('public'));

// POST route to receive a string and return a string using the run function
app.post('/AskAi', async (req, res) => {

    let aiResult = null;
  
    try {
      const inputText = req.body.text;
      const runID = req.body.RunId;
      
      const fullPromptObject = req.body.prompt; // Assuming the input text is sent in the body with key 'text'
      const promptID = fullPromptObject.promptID;
      if (!inputText) {
        return res.status(400).send('No text provided');
      }
      const temp  = parseFloat(req.body.temp);
      
      if (req.body.model ==='gemini-1.5') {
         aiResult = await AskGemini(inputText,temp); // Use the run function from the provided code
      }
      else if (req.body.model ==='gpt-3.5-turbo' || req.body.model ==='gpt-4o-mini') {
         aiResult = await AskOpenAI(inputText,temp,req.body.model); // Use the run function from the provided code
         //remember there is usage in the response can be used to track the usage (for a later stage)
         aiResult = aiResult.text;

      }

      //console.log('aiResult',aiResult);
      const resString = cleanJsonString(aiResult);
      //console.log(resString);
      const resParsed = JSON.parse(resString);
      //console.log('Parsed JSON response:', resParsed,'fullPromptObject',fullPromptObject);


      const execuationObj = transformData(resParsed,req.body.model);
      
      
      // pass the batchName 
      let resultexecute = null;
      if (execuationObj.length > 0) {
        //console.log('before executeSpInsertToExecution',execuationObj,fullPromptObject.batchName,temp,promptID);
        resultexecute = await executeSpInsertToExecution(execuationObj,fullPromptObject.batchName,temp,fullPromptObject.userName,promptID,runID); // Use the provided function to insert the question object
        //console.log('resultexecute',resultexecute);
      }
      res.json({ resultexecute });
  
    } catch (error) {
      console.error('Error processing string:', error);
      res.status(500).send({errorName:'Internal Server Error',err:error});
    }
 

 
  
  

 
});

app.post('/SavePrompt', async (req, res) => {
  
    try {
      const promptObject = req.body; // Assuming the question object is sent in the body
      if (!promptObject) {
        return res.status(400).send('No prompt object provided');
      }
      const result = await InsertPromptToDB(promptObject); 
      res.json({ result });
  
    } catch (error) {
      console.error('Error inserting Prompt:', error);
      res.status(500).send('Internal Server Error Prompt');
    }
});


// POST route to receive a question object and insert it into the database
app.post('/insertExecuation', async (req, res) => {
  try {
    const questionObject = req.body; // Assuming the question object is sent in the body
    if (!questionObject) {
      return res.status(400).send('No question object provided');
    }
    const result = await executeSpInsertToExecution(questionObject); // Use the provided function to insert the question object
    res.json({ result });

  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/insertQuestions', async (req, res) => {
  try {
    const questionObjects = req.body; // Assuming the question object is sent in the body
    if (!questionObjects) {
      return res.status(400).send('No question object provided');
    }
    const result = await InsertToQuestion(questionObjects); // Use the provided function to insert the question object
    res.json({ result });

  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/insertAnswers', async (req, res) => {
  try {
    // Decompress the data using pako
     const decompressed = Pako.ungzip(req.body, { to: 'string' });

     // Parse the decompressed JSON
     const answersObjects = JSON.parse(decompressed);

    if (!answersObjects) {
      return res.status(400).send('No answers object provided');
    }
    console.log('answersObjects',answersObjects)
    const result = await InsertToAnswer(answersObjects); // Use the provided function to insert the question object
    res.json({ result });

  } catch (error) {
    console.error('Error inserting question:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/Login', async (req, res) => {
  try {
    const user = req.body; 
    if (!user) {
      return res.status(400).send('No user object provided');
    }

    if ((user.username == process.env.USER2 || user.username==process.env.USER1)&& user.password == process.env.APP_PASSWORD) {
      res.json({ result: 'success',user:user });
    }
    else {
      res.json({ result: 'failed',user:user });
    }
   

  } 
  catch (error) {
    console.error('Failed to login to server: ', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/getAllPrompt', async (req, res) => {
  try {
    const promptsList = await getAllPrompts(); // Use the provided function to get all prompts
    res.json({ promptsList });
  } 
  catch (error) {
    console.error('Error retrieving prompts:', error);
    res.status(500).send('Internal Server Error getAllPrompt');
  }
});


// GET route to retrieve all execution scores from the database
app.get('/getAllExecutionScores', async (req, res) => {
  try {
    const scores = await getAllExecutionScores(); // Use the provided function to get all execution scores
    res.json({ scores });

  } catch (error) {
    console.error('Error retrieving scores:', error);
    res.status(500).send('Internal Server Error');
  }
});


//GET ALL HISTORY from the database
app.get('/getHistory', async (req, res) => {
  try {
    const history = await getExecutionScoresWithRunIDs(); // Use the provided function to get all execution scores
    res.json({ history });

  } catch (error) {
    console.error('Error retrieving History:', error);
    res.status(500).send('Internal Server Error',error);
  }
});

//GET ALL MODEL SCORES from the database
/////////////// this 2 methods is post because more easy pass the params in the body
app.post('/getModelScores', async (req, res) => {
  try {
    //console.log('req.query',req.body);
    const domain = req.body.domain;
    const models = await getModelScores(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });

  } 
  catch (error) {
    console.error('Error retrieving models stats: getModelScores', error);
    res.status(500).send('Internal Server Error : Error retrieving models stats: getModelScores',error);
  }
});

app.post('/getConsistencyModels', async (req, res) => {
  const domain = req.body.domain;
  try {
    const models = await getconsistencyModels(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });

  } 
  catch (error) {
    console.error('Error retrieving models stats: getconsistencyModels', error);
    res.status(500).send('Internal Server Error',error);
  }
});

app.post('/getCoherencyBetweenModels', async (req, res) => {
  const domain = req.body.domain;
  try {
    const models = await getcoherencyBetweenModels(domain); // Use the provided function to get stats about consistency of model
    res.json({ models });

  } 
  catch (error) {
    console.error('Error retrieving models stats: getcoherencyBetweenModels', error);
    res.status(500).send('Internal Server Error',error);
  }
});
/////////////////
app.get('/getDetailsConsistencyModels', async (req, res) => {
  try {
    const models = await getdetailedConsistencyModel(); // Use the provided function to get stats about consistency of model
    res.json({ models });

  } 
  catch (error) {
    console.error('Error retrieving models stats: getdetailedConsistencyModel', error);
    res.status(500).send('Internal Server Error',error);
  }
});

// GET route to retrieve all questions from the database
app.get('/getAllQuestions', async (req, res) => {
  try {
    const questions = await getAllQuestions(); // Use the provided function to get all questions
    //console.log('in the controller ',questions)
    res.json({ questions });

  } catch (error) {
    console.error('Error retrieving questions:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Optionally, explicitly serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '../pages/Login.html'));
});

// Start the server
app.listen(port, () => {
  console.log('__dirname',__dirname)
  console.log(`Server running at http://localhost:${port}`);
});