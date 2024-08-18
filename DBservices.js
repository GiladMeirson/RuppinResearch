import sql from 'mssql';
import dotenv from 'dotenv';
import {transformQuestionsAndAnswers} from './utils.js';

dotenv.config();

//igroup193_35344	igroup193
// Configuration object
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};












// Connect to the database
async function connectToDatabase() {
    try {
        let pool = await sql.connect(config);
        console.log('Connected to the database');

        // Example query
        let result = await pool.request().query('select * from stam');
        console.log(result);

        // Close the connection
        sql.close();
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}
async function executeSpInsertToExecution(questionObjects,batchName,temp) {
    let pool;
    let transaction;
    try {
        pool = await sql.connect(config);
        console.log('Connected to the database');

        // Start a transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        let result = null;
        // Process each object in the array
        for (const questionObject of questionObjects) {
            result = await request
                .input('batchName', sql.VarChar(55), batchName)
                .input('QuestionID', sql.Int, questionObject.QuestionID)
                .input('AnswerID', sql.Int, questionObject.AnswerID)
                .input('AnswerIndex', sql.TinyInt, questionObject.AnswerIndex)
                .input('HumanRank', sql.Int, questionObject.HumanRank)
                .input('AiRank', sql.Int, questionObject.AiRank)
                .input('AiExplnation', sql.NVarChar(sql.MAX), questionObject.AiExplnation)
                .input('ModelName', sql.NVarChar(55), questionObject.modelName)
                .input('temp', sql.Float, temp)
                .execute('sp_insertToExecution');
            // Clear the inputs for the next iteration
            request.parameters = {};

            console.log(`Stored procedure executed for QuestionID: ${questionObject.QuestionID}`);
            
            // Clear the inputs for the next iteration
            
            
        }

        // Commit the transaction
        await transaction.commit();
        console.log('All inserts committed successfully');

        // Close the connection
        await sql.close();
        
        return { success: true, message: 'All records inserted successfully',data:result.recordset };
    } catch (err) {
        console.error('Database operation failed:', err);
        
        // If there's an error, roll back the transaction
        if (transaction) {
            await transaction.rollback();
            console.log('Transaction rolled back due to error');
        }
        
        // Make sure to close the connection even if there's an error
        if (pool) {
            await sql.close();
        }
        
        throw err;  // Re-throw the error for the caller to handle
    }
}

export async function InsertToQuestion(questionsArray) {
    let pool;
    let transaction;
    try {
        pool = await sql.connect(config);
        console.log('Connected to the database');

        // Start a transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Process each object in the array
        for (const question of questionsArray) {
            await request
                .input('Id', sql.Int, question.Id)
                .input('AcceptedAnswerId', sql.Int, question.AcceptedAnswerId ? question.AcceptedAnswerId : null)
                .input('CreationDate', sql.DateTime, question.CreationDate)
                .input('DeletionDate', sql.DateTime, question.DeletionDate? question.DeletionDate : null)
                .input('Score', sql.Int, question.Score)
                .input('ViewCount', sql.Int, question.ViewCount)
                .input('Body', sql.NVarChar(sql.MAX), question.Body)
                .input('OwnerUserId', sql.Int, question.OwnerUserId)
                .input('OwnerDisplayName', sql.NVarChar(255), question.OwnerDisplayName ? question.OwnerDisplayName : null)
                .input('LastEditorUserId', sql.Int, question.LastEditorUserId ? question.LastEditorUserId : null)
                .input('LastEditorDisplayName', sql.NVarChar(255), question.LastEditorDisplayName ? question.LastEditorDisplayName : null)
                .input('LastEditDate', sql.DateTime, question.LastEditDate ? question.LastEditDate : null)
                .input('LastActivityDate', sql.DateTime, question.LastActivityDate ? question.LastActivityDate : null)
                .input('Title', sql.NVarChar(255), question.Title)
                .input('Tags', sql.NVarChar(255), question.Tags)
                .input('AnswerCount', sql.Int, question.AnswerCount)
                .input('CommentCount', sql.Int, question.CommentCount)
                .input('FavoriteCount', sql.Int, question.FavoriteCount ? question.FavoriteCount : null)
                .input('ClosedDate', sql.DateTime, question.ClosedDate ? question.ClosedDate : null)
                .input('CommunityOwnedDate', sql.DateTime, question.CommunityOwnedDate ? question.CommunityOwnedDate : null)
                .input('ContentLicense', sql.NVarChar(255), question.ContentLicense)
                .input('BatchName', sql.VarChar(55), question.batchID)
                .execute('spInsertQuestion');

            // Clear the inputs for the next iteration
            request.parameters = {};
        }

        // Commit the transaction
        await transaction.commit();
        console.log('All inserts committed successfully - Questions !');

        // Close the connection
        await sql.close();
        
        return { success: true, message: 'All records inserted successfully' };
    } catch (err) {
        console.error('Database spInsertQuestion operation failed:', err);
        
        // If there's an error, roll back the transaction
        if (transaction) {
            await transaction.rollback();
            console.log('Transaction rolled back due to error');
        }
        
        // Make sure to close the connection even if there's an error
        if (pool) {
            await sql.close();
        }
        
        throw err;  // Re-throw the error for the caller to handle
    }
}

export async function InsertToAnswer(answersArray) {
    let pool;
    let transaction;
    try {
        pool = await sql.connect(config);
        console.log('Connected to the database');

        // Start a transaction
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Process each object in the array
        for (const answer of answersArray) {
            await request
                .input('Id', sql.Int, answer.Id)
                .input('ParentId', sql.Int, answer.ParentId)
                .input('CreationDate', sql.DateTime, answer.CreationDate)
                .input('DeletionDate', sql.DateTime, answer.DeletionDate ? answer.DeletionDate : null)
                .input('Score', sql.Int, answer.Score)
                .input('Body', sql.NVarChar(sql.MAX), answer.Body)
                .input('OwnerUserId', sql.Int, answer.OwnerUserId)
                .input('OwnerDisplayName', sql.NVarChar(40), answer.OwnerDisplayName ? answer.OwnerDisplayName : null)
                .input('LastEditorUserId', sql.Int, answer.LastEditorUserId ? answer.LastEditorUserId : null)
                .input('LastEditorDisplayName', sql.NVarChar(40), answer.LastEditorDisplayName ? answer.LastEditorDisplayName : null)
                .input('LastEditDate', sql.DateTime, answer.LastEditDate ? answer.LastEditDate : null)
                .input('LastActivityDate', sql.DateTime, answer.LastActivityDate ? answer.LastActivityDate : null)
                .input('CommunityOwnedDate', sql.DateTime, answer.CommunityOwnedDate ? answer.CommunityOwnedDate : null)
                .input('ContentLicense', sql.NVarChar(30), answer.ContentLicense)
                .input('BatchName', sql.VarChar(55), answer.BatchName)
                .input('NormalizedScore', sql.Int, answer.NormalizedScore)
                .input('Label',sql.VarChar(32),answer.Label)
                .input('LabelRank',sql.Int,answer.LabelRank)
                .input('AnswerOrder',sql.Int,answer.AnswerOrder)
                .input('ViewCount', sql.Int, answer.ViewCount ? answer.ViewCount : null)
                .input('ClosedDate', sql.DateTime, answer.ClosedDate ? answer.ClosedDate : null)
                .execute('spInsertAnswers');

            // Clear the inputs for the next iteration
            request.parameters = {};
        }

        // Commit the transaction
        await transaction.commit();
        console.log('All inserts committed successfully - Answers !');

        // Close the connection
        await sql.close();
        
        return { success: true, message: 'All records inserted successfully' };
    } 
    catch (err) {
        console.error('Database spInsertAnswer operation failed:', err);
        
        // If there's an error, roll back the transaction
        if (transaction) {
            await transaction.rollback();
            console.log('Transaction rolled back due to error');

        }
    }
}


// ^^^^^^^^ Example usage ^^^^^^^^^:
// const questionObject = {
//     batchID: 1,
//     QuestionID: 100,
//     AnswerID: 200,
//     AnswerIndex: 1,
//     HumanRank: 5,
//     AiRank: 4,
//     AiExplnation: 'This is an AI explanation'
//    modelName: 'Gemini-1.5-flash'
// };

// executeSpInsertToExecution(questionObject)
//     .then(result => console.log('Operation completed:', result))
//     .catch(err => console.error('Error:', err));

export async function getAllExecutionScores() {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request().execute('spGetAllExecutaionScores');
        
        const scores = result.recordset.map(row => ({
            QuestionID: row.QuestionID,
            RunGroup: row.RunGroup,
            TotalPositionDifference: row.TotalPositionDifference,
            ModelName: row.ModelName,
        }));

        //console.log('Execution scores:', scores)

        return scores;
    } catch (err) {
        console.error('Error in getAllExecutionScores DBservices --> ', err);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

export async function getAllQuestions(){
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request().execute('spGetAllQuestions');
        const test = transformQuestionsAndAnswers(result.recordset);
        //console.log('test',test[4])
        // const Questions = result.recordset.map(row => ({
        //     serialNum: row.serialNum,
        //     Id: row.Id,
        //     AcceptedAnswerId: row.AcceptedAnswerId,
        //     CreationDate: row.CreationDate,
        //     DeletionDate: row.DeletionDate,
        //     Score: row.Score,
        //     ViewCount: row.ViewCount,
        //     Body: row.Body,
        //     OwnerUserId: row.OwnerUserId,
        //     OwnerDisplayName: row.OwnerDisplayName,
        //     LastEditorUserId: row.LastEditorUserId,
        //     LastEditorDisplayName: row.LastEditorDisplayName,
        //     LastEditDate: row.LastEditDate,
        //     LastActivityDate: row.LastActivityDate,
        //     Title: row.Title,
        //     Tags: row.Tags,
        //     AnswerCount: row.AnswerCount,
        //     CommentCount: row.CommentCount,
        //     FavoriteCount: row.FavoriteCount,
        //     ClosedDate: row.ClosedDate,
        //     CommunityOwnedDate: row.CommunityOwnedDate,
        //     ContentLicense: row.ContentLicense,
        //     BatchName: row.BatchName
        // }));
        return test;

    }
     catch (err) {
        console.error('Error in getAllQuestions DBservices --> ', err);
        throw err;
    } 
    finally {
        if (pool) {
            await pool.close();
        }
    }
}







export { executeSpInsertToExecution };
