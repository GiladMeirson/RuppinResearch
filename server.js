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

import 
{ 
  executeSpInsertToExecution,
  getAllExecutionScores,
  InsertToQuestion,
  getAllQuestions,
  InsertToAnswer
} from './DBservices.js';



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
      const fullPromptObject = req.body.prompt; // Assuming the input text is sent in the body with key 'text'
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
        console.log('before executeSpInsertToExecution',execuationObj,fullPromptObject.batchName,temp);
        resultexecute = await executeSpInsertToExecution(execuationObj,fullPromptObject.batchName,temp); // Use the provided function to insert the question object
        console.log('resultexecute',resultexecute);
      }
      res.json({ resultexecute });
  
    } catch (error) {
      console.error('Error processing string:', error);
      res.status(500).send('Internal Server Error');
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
  res.sendFile(path.join(__dirname, 'public', '../pages/sendQuestion.html'));
});

// Start the server
app.listen(port, () => {
  console.log('__dirname',__dirname)
  console.log(`Server running at http://localhost:${port}`);
});