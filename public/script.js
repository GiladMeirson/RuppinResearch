const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : '';


const POST_URL_AskAi = prefix+'/AskAi';
const POST_URL_INSERT_EXECUTION = prefix+'/insertExecuation';
const GET_URL_ALL_EXECUTION_SCORES = prefix+'/getAllExecutionScores';
const POST_URL_INSERT_QUESTIONS = prefix+'/insertQuestions';
const GET_URL_ALL_QUESTIONS = prefix+'/getAllQuestions';
const POST_URL_INSERT_ANSWERS = prefix+'/insertAnswers';
const POST_URL_INSERT_PROMPT = prefix+'/SavePrompt';
const GET_URL_ALL_PROMPT_LIST = prefix+'/getAllPrompt';

DELAY_REQUEST = 5000; // 5 seconds per request of LLM model to the server.

GroupData=[];
CheckedQuestions=[];
CurrentJSON_DATA=[];
CurrentQuestionID_DATA=[];
PROMPT_LIST=[];
PROMPT_WRAP = [
`You are an AI assistant helping me rank answers to questions asked on StackOverflow.Here is the question: Question ID:`,
`Question body:`,
`Here are the answers given to this question:`,
`Rank these answers from best to worst and add a rating from 1-10 for each one. Return your response in JSON format only, like this:
[
    {
        "answer_index": 1-3,
        "answer_id": "the id of the answer",
        "question_id": "the id of the question",
        "rating": 1-10,
        "reason": "something"
    },
    // ... more answers ...
]`


]
CurrentPromptId = null;
PROMPT_TEXT_BEFORE_TRIM=``;
username = '';
Q=[];
DATAtable=null;
RESULT=[];
let executionScores = []; 
$(document).ready(function() {
    $('#loading').show();
    GetQuestionApiCall();
    getAllPromptList();
    username = JSON.parse(localStorage.getItem('user')).username;
    console.log('current username:', username);
    $('#sendToDB').prop('disabled', true);

    //get the score of the executaions from the server.
    //fetchAndProcessExecutionScores();

    // Temperature slider functionality
    const temperatureSlider = $('#temperature-slider');
    const temperatureValue = $('#temperature-value');
 
    temperatureSlider.on('input', function() {
         const value = $(this).val();
         temperatureValue.text(value);
    });



    DataTableEvent();

    // Handle "Send Selected Questions" button
    $('.send-button').on('click', function() {
        const selectedRows = DATAtable.rows().nodes().filter(function(tr) {
            return $(tr).find('.row-checkbox').prop('checked');
        });
        const selectedData = selectedRows.map(function(tr) {
            return DATAtable.row(tr).data();
        }).toArray();

        const selectedModel = $('#model-select').val();
        const temperature = $('#temperature-slider').val();

        if (selectedModel && selectedData.length > 0) {
            //console.log('Selected Model:', selectedModel);
            //console.log('Temperature:', temperature);
            //console.log('Selected Questions:', selectedData);


            // Here you would typically send this data to your backend
            //alert(`Sending ${selectedData.length} questions to ${selectedModel}`);
            //console.log(generateLLMPrompt(selectedData[i],selectedModel));
            
            // here we need to make a timeout to send request of each question to ai api by the model name.
            $('#loading').show();
            RendderToConfirmModal(selectedModel,selectedData)
            $('#modalBeforeSendQuestions').show();

            $('#sendToLLMBTN').on('click', function() {
                // console.log($('#RunIdIN').val());
                // console.log($('#delayInSeconds').val());
                // console.log('Selected Model:', selectedModel);
                // console.log('Temperature:', temperature);
                // console.log('Selected Questions:', selectedData);
                DELAY_REQUEST = parseFloat($('#delayInSeconds').val())*1000;
                const RunId = $('#RunIdIN').val();
                if (RunId=='') {
                    $.notify("Please enter a Run ID.", "warn");
                    return;
                }
                if (CurrentPromptId==null) {
                    $.notify("Please save the prompt before sending the questions.", "warn");
                    return;
                    
                }
                $('#modalBeforeSendQuestions').hide();
                $('#counterModal').show();
                $('#QuestionLengthSpan').html(selectedData.length);
                for (let i = 0; i < selectedData.length; i++) {
                    setTimeout(() => {
                        const prompt = generateLLMPrompt(selectedData[i],selectedModel,parseFloat(temperature));
                        //console.log('Prompt:', prompt.text);
                        let isLastI = i==selectedData.length-1?true:false;
                        AiAPICall(prompt,isLastI,RunId,i);

                    }, DELAY_REQUEST * i);
                }
            });
            
 


        } else {
           
            $.notify("Please select a model and at least one question.", "warn");
        }
    });

    // CSV file upload and send to DB
    $('#sendToDB').on('click', function() {
        const fileInput = $('#csvFileInput')[0];
        console.log(fileInput.files);
        if (fileInput.files.length > 0) {
            
            const fileName = fileInput.files[0].name;
            $('#batchIDInput').val(fileName.replace('.csv', '')); // Set default value to file name 
           
           const sizes = splitQuestionAndAnswers(CurrentJSON_DATA);

            $('#IdentifiedLabel').html(`
                Identified - <br>
                Questions: ${sizes.questionsLength} <br>
                Answers: ${sizes.answersLength}`);

            $('#batchIDModal').css('display', 'block');

            
        } else {
            alert('Please select a CSV file first.');
        }
    });

    $('#confirmBatchID').on('click', function() {
        const batchID = $('#batchIDInput').val();
        if (batchID) {
            // Here you would typically send the file and batchID to your backend
            //console.log('Sending file to DB with BatchID:', batchID);
            //console.log('Questions IDs:', CurrentQuestionID_DATA);
            //console.log('Questions Data:', GetQuestionByIDArray(CurrentQuestionID_DATA));
            const questionobjectToServer = GetQuestionByIDArray(CurrentQuestionID_DATA);
            const answersobjectToServer = NormalizeAnswers(CurrentJSON_DATA,batchID);
            questionobjectToServer.forEach(question => {
                question.batchID = batchID;
            });
            $('#loading').show();
            console.log('Questions before* to be inserted to DB:', questionobjectToServer);
            console.log('Answers before* to be inserted to DB:', answersobjectToServer);
            // Compress answers object
            const compressedAnswers = pako.gzip(JSON.stringify(answersobjectToServer));
            //console.log('Compressed Answers:', compressedAnswers,JSON.stringify(compressedAnswers));  

            // You can add AJAX call here to send data to server
            $.ajax({
                url: POST_URL_INSERT_QUESTIONS,
                method: 'POST',
                data: JSON.stringify(questionobjectToServer),
                contentType: 'application/json',
                success: function(response) {
                    // Handle the response here
                    console.log('Questions inserted to DB success CB ',response);
                    $.ajax({
                        url: POST_URL_INSERT_ANSWERS,
                        method: 'POST',
                        data: JSON.stringify(compressedAnswers),
                        contentType: 'application/json',
                        success: function(response) {
                            console.log('AJAX call successful:', response);
                            // Handle the response here
                            console.log('Answers inserted to DB success CB ',response);
                            $('#loading').hide();
                            Swal.fire({
                                title: "The questions and answers were inserted successfully!",
                                text: "You can show the questions in the table now.",
                                icon: "success"
                            });
                            // here render the data table with the new data.
                            window.location.reload();


                        },
                        error: function(error) {
                            console.error('AJAX call failed:', error);
                            $('#loading').hide();
                            Swal.fire({
                                title: "Error",
                                text: "An error occurred while inserting questions and answers to the database.",
                                icon: "error"
                            });
                            
                            // Handle the error here
                        }
                    });




                  
                },
                error: function(error) {
                    console.error('AJAX call failed:', error);
                    $('#loading').hide();
                    // Handle the error here
                }
            });


            $('#batchIDModal').css('display', 'none');
        } else {
            alert('Please enter a Batch ID.');
        }
    });

    // Close modal if clicked outside
    $(window).on('click', function(event) {
        if (event.target == $('#batchIDModal')[0]) {
            $('#batchIDModal').css('display', 'none');
        }
    });
    // Add event listener to file input
    document.getElementById('csvFileInput').addEventListener('change', handleFileUpload);





});




function generateKey(input) {
    const timestamp = Date.now();
    let strNum = timestamp.toString();
    let chars = ``;
    for (let i = 0; i < 4; i++) {
        const random = 97 + Math.floor(Math.random() * 26);
        chars+=String.fromCharCode(random);
    }
    strNum = strNum.slice(-6);
    strNum += chars;
    input.value = strNum;
}

function RendderToConfirmModal(modelName,questionArray) {
    $('#modelTitleh1').html(`The choosen model : ${modelName}`);
    let sumOftokens=0;
    questionArray.forEach((item, index) => {
        sumOftokens+=calcTokens(item.serialNum);
    });
    
    const cost = calcCost(sumOftokens,modelName);
    //console.log('sumOftokens:',sumOftokens,modelName,cost);
    $('#costTitleh3').html(`The cost of this run: ${cost}¢`);
    $('#QuestAmountTitle').html(`You are going to send ${questionArray.length} questions`);
}



function closeConModal() {
    $('#modalBeforeSendQuestions').hide();
    $('#loading').hide();
}

function DataTableEvent(){
      // Handle "Select All" checkbox
    $('#select-all-checkbox').on('change', function() {
        const isChecked = this.checked;
        
        // Select/deselect checkboxes on the current page
        $('.row-checkbox').prop('checked', isChecked);
        
        // Select/deselect checkboxes on all pages
        DATAtable.rows().every(function() {
            $(this.node()).find('.row-checkbox').prop('checked', isChecked);
        });
    });

   // Update "Select All" checkbox state when individual checkboxes change
   $('#question-table').on('change', '.row-checkbox', function() {
        const allChecked = DATAtable.rows().nodes().toArray().every(function(tr) {
            return $(tr).find('.row-checkbox').prop('checked');
        });
        $('#select-all-checkbox').prop('checked', allChecked);
    });

    
    // Add event listener for row clicks to show question details
    $('#question-table tbody').on('click', 'td.title', function(e) {
        // Prevent opening details when clicking on the checkbox
        if ($(e.target).hasClass('row-checkbox')) {
            return;
        }
        console.log('Row clicked'); // Debug log

        const data = DATAtable.row(this).data();
        showQuestionDetails(data);
    });

}

function parseUniversalDate(dateString) {
    const parsed = Date.parse(dateString);
    if (!isNaN(parsed)) {
        return parsed;
    }

    const parts = dateString.split(/[-/\s:]/);
    
    if (parts.length < 3) {
        return null;
    }

    let year, month, day, hours = 0, minutes = 0, seconds = 0;

    if (parts[0].length === 4) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
    } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
    }

    if (parts.length > 3) {
        hours = parseInt(parts[3]) || 0;
        minutes = parseInt(parts[4]) || 0;
        seconds = parseInt(parts[5]) || 0;
    }

    return new Date(year, month, day, hours, minutes, seconds).getTime();
}


function limitToThreeOccurrences(arr) {
    const occurrences = {};
    const result = [];
  
    for (const item of arr) {
      const qId = item.QId;
      
      if (!occurrences[qId]) {
        occurrences[qId] = 0;
      }
  
      if (occurrences[qId] < 3) {
        result.push(item);
        occurrences[qId]++;
      }
    }
  
    return result;
}


// Function to show question details
function showQuestionDetails(question) {
        console.log('showQuestionDetails:', question);
        const tags = parseTags(question.Tags);
        const detailsHTML = `
            <div class="question-details">
                <h2>${question.Title}</h2>
                <p><strong>Question Score:</strong> ${question.QuestionScore}</p>
                <p><strong>View Count:</strong> ${question.ViewCount}</p>
                <p><strong>Answer Count:</strong> ${question.AnswerCount}</p>
                <p><strong>Favorite Count:</strong> ${question.FavoriteCount}</p>
                <h3>Question Body:</h3>
                <div class="question-body">${formatContent(question.Body)}</div>
                <h3>Tags:</h3>
                <p>${tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                <h3>Answers:</h3>
                ${question.answers.map(answer => `
                    <div class="answer">
                        <div class="answer-header">
                            <span class="answer-score">Score: ${answer.Score}</span>
                            <span class="answer-date">Answered on: ${new Date(answer.AnswerCreationDate).toLocaleString()}</span>
                        </div>
                        <div class="answer-body">${formatContent(answer.Body)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Create a modal to display question details
        $('<div>')
            .html(detailsHTML)
            .dialog({
                title: 'Question Details',
                width: Math.min($(window).width() * 0.8, 800),
                height: Math.min($(window).height() * 0.8, 600),
                modal: true,
                create: function() {
                    $(this).css("maxWidth", "100%");
                },
                open: function() {
                    $('.ui-widget-overlay').on('click', function() {
                        $(this).siblings('.ui-dialog').find('.ui-dialog-content').dialog('close');
                    });
                }
            });
}
// Function to format content, handling images and code blocks
function formatContent(content) {
        //console.log('formatContent:', content);
        // Replace image tags with responsive ones
        content = content.replace(/<img[^>]+>/g, function(imgTag) {
            return imgTag.replace(/width="[^"]*"/g, 'width="100%"')
                         .replace(/height="[^"]*"/g, 'height="auto"');
        });

        // Wrap code blocks with pre tags if not already wrapped
        content = content.replace(/<code>([\s\S]*?)<\/code>/g, function(match, codeContent) {
            if (match.indexOf('<pre>') === -1) {
                return '<pre><code>' + codeContent + '</code></pre>';
            }
            return match;
        });

        return content;
}
// Function to parse tags string into an array
function parseTags(tagsString) {
        return tagsString.slice(1, -1).split('><');
}
// Function to handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            const jsonData = csvToJson(csvContent);
            CurrentJSON_DATA = jsonData;
            if (CurrentJSON_DATA.length > 0) {
                $('#sendToDB').prop('disabled', false).css('cursor', 'pointer');
                
            }
            //console.log('Converted JSON:', jsonData);
            
            // Here you can do something with the jsonData, like sending it to a server
        };
        reader.readAsText(file);
    }
}

function csvToJson(csvString) {
    // Function to parse a single CSV line, handling quoted fields
    function parseCSVLine(line) {
      const result = [];
      let start = 0;
      let inQuotes = false;
  
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
          result.push(line.slice(start, i).trim().replace(/^"|"$/g, ''));
          start = i + 1;
        }
      }
      
      result.push(line.slice(start).trim().replace(/^"|"$/g, ''));
      return result;
    }
  
    // Split the CSV string into lines, handling potential line breaks within quoted fields
    const lines = csvString.split(/\r?\n(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  
    // Extract headers (first line)
    const headers = parseCSVLine(lines[0]);
  
    // Initialize the result array
    const result = [];
  
    // Process each line (skip the header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {  // Skip empty lines
        const values = parseCSVLine(line);
        if (values.length === headers.length) {  // Ensure the line has the correct number of fields
          const obj = {};
          
          // Map each value to its corresponding header
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          
          result.push(obj);
        }
      }
    }
  
    return limitToThreeOccurrences(result);
}

function getAllPromptList() {
    $('#loading').show();
    //ajax to get all the prompts from the server.
    $.ajax({
        url: GET_URL_ALL_PROMPT_LIST,
        method: 'GET',
        success: function(response) {
            console.log('AJAX call successful:', response);
            PROMPT_LIST = response.promptsList;
            
            // Handle the response here
            $('#loading').hide();
            renderToPromptSelect();
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            // Handle the error here
        }
    });
}

function renderToPromptSelect(){
    if (PROMPT_LIST.length>0) {
        $('#PromptList').html(`<option value="-1">NEW PROMPT</option>`)
        for (let i = 0; i < PROMPT_LIST.length; i++) {
            const prompt = PROMPT_LIST[i];
            $('#PromptList').append(`<option value="${prompt.PromptID}">${prompt.PromptName}</option>`);

            
        }
        
        $('#PromptList').val(PROMPT_LIST[PROMPT_LIST.length - 1].PromptID);
        $('#WrapValue').val(PROMPT_LIST[PROMPT_LIST.length - 1].PromptTemplate);
        CurrentPromptId = PROMPT_LIST[PROMPT_LIST.length - 1].PromptID;
        
    }
}

function renderTextArea(select){
    //console.log('select:',select.value);

    const selectID = parseInt(select.value);
    if (selectID!=-1) {
        const prompt = PROMPT_LIST.find(p => p.PromptID == selectID);
        $('#WrapValue').val(prompt.PromptTemplate);
        CurrentPromptId = selectID;
    }

}

// Shuffle function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function splitQuestionAndAnswers(data) {
  answersLength = data.length;
  const questions = [];
  data.forEach((item, index) => {
    //console.log(questions, item.ParentId,questions.includes(item.ParentId)==false);
    if (questions.includes(item.AParentId)==false ) {
        questions.push(item.AParentId);
    }
  });
  //console.log('questions.length',questions.length);
  CurrentQuestionID_DATA = questions;
  return {
    answersLength: answersLength,
    questionsLength: questions.length
}
}


function AiAPICall(prompt,isLast,RunId,i) {
    const request =
    {
        RunId: RunId,
        text: prompt.text,
        model:prompt.modelName,
        temp:prompt.temperature,
        prompt: prompt
    };
    $('#loading').show();
    //console.log('Sending request:',POST_URL_AskAi, request);
    $.ajax({
        url: POST_URL_AskAi,
        method: 'POST',
        data: JSON.stringify(request),
        contentType: 'application/json',
        success: function(response) {
            console.log('AJAX call successful:', response);
            $('#counterSpanSent').html(i+1);
            // Handle the response here
            //response.result.temperature = prompt.temperature;

            //console.log('response.result',response.result);
            //stop here ! 
            //until here we need to understand the respone from the LLM and the comparing between the human and the AI.
            // here handle the logic of return comparing between the human and the AI.


            //object example ! 

            // response.resultexecute  {
            //     "success": true,
            //     "message": "All records inserted successfully",
            //     "data": [
            //         {
            //             "batchName": "11",
            //             "QuestionID": 5005379,
            //             "total_difference": "0",
            //             "answer_count": 3,
            //             "match_quality": "Perfect match"
            //         }
            //     ]
            // }


            //successCallbackLLMcall(response);
            isLast ? location.reload() : null;
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            // Handle the error here
        }
    });
}

function GetQuestionByIDArray(QuestionIDArray) {
    const questions = [];
    QuestionIDArray.forEach((item, index) => {
        const question = CurrentJSON_DATA.find(q => q.AParentId == item);


      
        if (question) {
            //questions.push(question);
            questions.push({
                "Id": question.QId,
                "AcceptedAnswerId": question.QAcceptedAnswerId,
                "CreationDate":parseUniversalDate(question.QCreationDate),
                "DeletionDate": parseUniversalDate(question.QDeletionDate),
                "Score": question.QScore,
                "ViewCount": question.QViewCount,
                "Body": question.QBody,
                "OwnerUserId": question.QOwnerUserId,
                "OwnerDisplayName": question.QOwnerDisplayName,
                "LastEditorUserId": question.QLastEditorUserId,
                "LastEditorDisplayName": question.QLastEditorDisplayName,
                "LastEditDate": parseUniversalDate(question.QLastEditDate),
                "LastActivityDate": parseUniversalDate(question.QLastActivityDate),
                "Title": question.QTitle,
                "Tags": question.QTags,
                "AnswerCount": question.QAnswerCount,
                "CommentCount": question.QCommentCount,
                "FavoriteCount": question.QFavoriteCount,
                "ClosedDate": parseUniversalDate(question.QClosedDate),
                "CommunityOwnedDate": parseUniversalDate(question.QCommunityOwnedDate),
                "ContentLicense": question.QContentLicense,
            });


            														
        }
    
        
    });
    return questions;
}


function SaveWrapModalConfig() {
    const promptText = $('#WrapValue').val();
    PROMPT_TEXT_BEFORE_TRIM = promptText;
    let firstSplited = promptText.split('${questionObject.Id}');
    const firstPrefix = firstSplited[0];
    let secondSplited = firstSplited[1].split('${questionBody}');
    const secondPrefix = secondSplited[0];
    let thirdSplited = secondSplited[1].split('${Answers}');
    const thirdPrefix = thirdSplited[0];
    const fourdPrefix = thirdSplited[1];

    //console.log('FIRST: ',firstPrefix,'SECOND: ',secondPrefix,'THIRD: ',thirdPrefix,'FOURD: ',fourdPrefix);

    if ($('#PromptList').val()=='-1') {
        $('#nameOfThePrmpt').show();
    }
    else{
        CurrentPromptId = parseInt($('#PromptList').val());
        $.notify("The prompt wrapper saved successfully", "success");
        $('#WrapModalConfig').hide();

    }
    PROMPT_WRAP = [firstPrefix,secondPrefix,thirdPrefix,fourdPrefix];
    
    // $('#WrapModalConfig').hide();
    // $.notify("The prompt wrapper saved successfully", "success");


    

}

function savePromptToDB() {
    $('#loading').show();
    //PROMPT_WRAP - the prompt value !.
    //username - the username of the user.
    const promptName = $('#promptName').val();
    console.log(PROMPT_TEXT_BEFORE_TRIM,username,promptName)

    
    const prompt = {
        text: PROMPT_TEXT_BEFORE_TRIM,
        username: username,
        promptName: promptName
    };
    //ajax to save the prompt to the server.
    $.ajax({
        url: POST_URL_INSERT_PROMPT,
        method: 'POST',
        data: JSON.stringify(prompt),
        contentType: 'application/json',
        success: function(response) {
            console.log('AJAX call successful:', response);
            // Handle the response here
            $('#nameOfThePrmpt').hide();
            $('#WrapModalConfig').hide();
            $('#loading').hide();
            $.notify("The prompt saved successfully", "success");
            CurrentPromptId = response.result.res[0].NewPromptId;

        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            // Handle the error here
            $('#nameOfThePrmpt').hide();
            $('#WrapModalConfig').hide();
            $('#loading').hide();
            $.notify("Error at save prompt - check the console", "error");
        }
    });
    
}

//return a propmt object.
function generateLLMPrompt(questionObject,modelName,temperature) {
    const questionBody = questionObject.Body.replace(/<[^>]*>/g, '').trim();
    const batchName = questionObject.BatchName;
    const answers = questionObject.answers.map((answer, index) => ({
        id: answer.Id,
        body: answer.Body.replace(/<[^>]*>/g, '').trim()
    }));

    const promptText = `${PROMPT_WRAP[0]}${questionObject.Id}
    ${PROMPT_WRAP[1]}
    ${questionBody}
    ${PROMPT_WRAP[2]}
    ${answers.map((answer, index) => `Answer ID: ${answer.id}\nAnswer ${index + 1}:\n${answer.body}`).join('\n\n')}
    ${PROMPT_WRAP[3]}`;

    
    const prompt = {
        text: normalizeSpaces(promptText),
        questionId: questionObject.Id,
        answersIds: answers.map(answer => answer.id),
        tokens: normalizeSpaces(promptText).split(/\s+/).length,
        modelName: modelName,
        temperature: temperature,
        batchName: batchName,
        userName: username,
        promptID: CurrentPromptId
    };

    return prompt;
}


// Assuming this function exists elsewhere in your code
function normalizeSpaces(text) {
    return text.replace(/\s+/g, ' ').trim();
}



//query functions
function showQuery(){
    $('#BaseQuery').show();
}
function copyQuery(){
    const text = $('#theQueryText').text();
    copyToClipboard(text);
}
function hideQuery(){
    $('#BaseQuery').hide();
}
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        $.notify("The query copied successfully", "success");

    }).catch(function(error) {
        console.error('Error copying text: ', error);
        $.notify("Error copying text:", "error");
    });
}
//query functions




// function normalizeSpaces(str) {
//     // Step 1: Trim leading and trailing spaces
//     str = str.trim();
    
//     // Step 2: Replace multiple spaces with a single space
//     str = str.replace(/\s+/g, ' ');
    
//     // Step 3: Ensure space after punctuation if followed by a word character
//     str = str.replace(/([.,!?:;])\s*(\w)/g, '$1 $2');
    
//     // Step 4: Remove space before punctuation
//     str = str.replace(/\s+([.,!?:;])/g, '$1');
    
//     return str;
// }




function GetQuestionApiCall(){

    $.ajax({
        url: GET_URL_ALL_QUESTIONS,
        method: 'GET',
        success: function(response) {
            console.log('Questions fetched successfully:', response);
            Q=response.questions;
            CreateDataTable(Q);
            $('#loading').hide();
        },
        error: function(error) {
            console.error('Failed to fetch api GET_URL_ALL_QUESTIONS:', error);
            swal({
                title: "Error",
                text: "Failed to fetch API GET_URL_ALL_QUESTIONS",
                icon: "error",
                button: "OK",
            });
            $('#loading').hide();
        }
    });

}



function NormalizeAnswers(answers,batchname) {
    answersObjects = [];
    answers.forEach((item, index) => {
        const answer = {
            Id: item.AId,
            ParentId: item.AParentId,
            CreationDate: parseUniversalDate(item.ACreationDate),
            DeletionDate: parseUniversalDate(item.ADeletionDate),
            Score: item.AScore,
            Body: item.ABody,
            OwnerUserId: item.AOwnerUserId,
            OwnerDisplayName: item.AOwnerDisplayName,
            LastEditorUserId: item.ALastEditorUserId,
            LastEditorDisplayName: item.ALastEditorDisplayName,
            LastEditDate: parseUniversalDate(item.ALastEditDate),
            LastActivityDate: parseUniversalDate(item.ALastActivityDate),
            CommentCount: item.ACommentCount,
            ContentLicense: item.AContentLicense,
            AnswerOrder: item.AnswerOrder,
            Label: item.Label,
            LabelRank: item.LabelRank,
            NormalizedScore: item.NormalizedScore,
            BatchName: batchname,
            ViewCount: item.AViewCount,
            ClosedDate: parseUniversalDate(item.AClosedDate),

        };
        answersObjects.push(answer);
    });
    return answersObjects;
}


function CreateDataTable (QuestionArray){
    // Initialize DataTable
    if (!$.fn.DataTable.isDataTable('#question-table')) {
        const table = $('#question-table').DataTable({
            data: QuestionArray,
            columnDefs: [
                { width: '5%', targets: 0 },  // Checkbox
                { width: '5%', targets: 1 },  // serialNum
                { width: '5%', targets: 2 },  // Id
                { width: '20%', targets: 3 }, // Title
                { width: '10%', targets: 4 }, // CreationDate
                { width: '5%', targets: 5 },  // Score
                { width: '5%', targets: 6 },  // ViewCount
                { width: '5%', targets: 7 },  // AnswerCount
                { width: '15%', targets: 8 }, // Tags
                { width: '10%', targets: 9 }, // BatchName
                { width: '10%', targets: 10 }, // modelName
                { width: '5%', targets: 11 }, // temp
                { width: '2%', targets: 12 }, // tokens
                { width: '2%', targets: 13 }  // cost
            ],
            columns: [
            {
                data: null,
                orderable: false,
                className: 'checkbox-column',
                render: function (data, type, row) {
                    return '<input type="checkbox" class="row-checkbox">';
                }
            },
            { data: 'serialNum' },
            { data: 'Id' },
            { data: 'Title' },
            { 
                data: 'CreationDate',
                render: function(data) {
                    return new Date(parseInt(data)).toLocaleDateString();
                }
            },
            { data: 'Score' },
            { data: 'ViewCount' },
            { data: 'AnswerCount' },
            { 
                data: 'Tags',
                render: function(data) {
                    const tags = parseTags(data);
                    return tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
                }
            },
            {
                data:'BatchName'
            },
            {
                data: 'modelName',
                render: function(data) {
                    return data || '---';
                }
            },
            {
                data: 'temp',
                render: function(data) {
                    if (data === 0) {
                        return data;
                    }
                    return data || '---';
                }
            },
            {
                data:'serialNum',
                render: function(data) {
                    return calcTokens(data);
                }
            },
            {
                data:'serialNum',
                render: function(data) {
                    return calcCost(calcTokens(data))+'¢';
                }
            }

        ],
            order: [[1, 'asc']],
            createdRow: function(row, data, dataIndex) {
                $(row).attr('id', `serialNum-${data.serialNum}`);
                $(row).find('td:eq(3)').addClass('title');
                colorRow(data,row);

            
            },
            drawCallback: function() {

            }
        });

        DATAtable = table;
        DataTableEvent();

        return DATAtable;
    }
}

function colorRow(data,row){
    //console.log(data,row);
    const colors = ['#5de263', '#ffed4c', '#e9766d'];
    if (data.MismatchScore !=null || data.MismatchScore ==='0') {
        const missmatchNum = parseInt(data.MismatchScore);
        $(row).css({
            'background-color': colors[missmatchNum/2], 
        });

    }
    else {
        return false;
    }
}



function calcTokens(unitQuestSerialNum) {
    const unitQuest = Q.find(q => q.serialNum == unitQuestSerialNum);
    const answers = unitQuest.answers;
    const question = unitQuest;
    let tokens = 0;

    // Remove <p> tags from question body
    const cleanedQuestionBody = question.Body.replace(/<\/?p>/g, '');
    tokens += cleanedQuestionBody.split(/\s+/).length;

    answers.forEach((answer) => {
        // Remove <p> tags from each answer body
        const cleanedAnswerBody = answer.Body.replace(/<\/?p>/g, '');
        tokens += cleanedAnswerBody.split(/\s+/).length;
    });

    return Math.round(tokens*1.1)+700;
}


function calcCost(tokens,modelName='gpt-4o-mini') {
    const outputTokensAVG = 1611;
    let sum = 0;

    if (modelName=='gpt-4o-mini') {
        const inputCost = tokens / 1000000 * 0.15;
        const outputCost = outputTokensAVG/1000000 * 0.6;
        sum = inputCost + outputCost;
        

    }
    if (modelName=='gemini-1.5') {
        return 0;
    }
    if (modelName=='gpt-3.5-turbo') {
        const inputCost = tokens / 1000000 * 0.5;
        const outputCost = outputTokensAVG/1000000 * 1.5;
        sum = inputCost + outputCost
    }
    
    sum=sum*100;
    return sum.toFixed(4);
  

    

}



function CloseWrapModalConfig(){
    $('#WrapModalConfig').hide();
}

function showWrap() {
    $('#WrapModalConfig').show();
}