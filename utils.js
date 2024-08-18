// Function to clean the string
export function cleanJsonString(str) {
    // Remove any potential hidden characters at the start of the string
    str = str.replace(/^\uFEFF/, '');
    // Remove any potential formatting characters
    str = str.replace(/^```json\s*/, '').replace(/```$/, '');
    str = str.replace("```", "");
    // Trim whitespace
    return str.trim();
}


export function transformData(data, modelName) {
    return data.map(res => ({
        QuestionID: res.question_id,
        AnswerID: res.answer_id,
        AnswerIndex: res.answer_index,
        HumanRank: null, // need to get it in the SQL
        AiRank: res.rating,
        AiExplnation: res.reason,
        modelName: modelName,
        temp: res.temperature
    
    }));
}




export function transformQuestionsAndAnswers(data) {
    const questionsMap = new Map();
  
    data.forEach(item => {
      const questionId = item.Id;
      const batchName = item.BatchName;
      const mapKey = `${questionId}-${batchName}`;
      
      if (!questionsMap.has(mapKey)) {
        // Create a new question object
        const question = {
          serialNum: item.serialNum,
          Id: questionId,
          Title: item.Title,
          CreationDate: item.creationDate,
          Score: item.Score,
          ViewCount: item.ViewCount,
          AnswerCount: item.AnswerCount,
          Tags: item.Tags,
          Body: item.Body,
          BatchName: batchName,
          modelName: item.modelName,
          temp: item.Temperature,
          MismatchScore: item.MismatchScore,
          MatchQuality: item.MatchQuality,
          ProcessedAnswersCount: item.ProcessedAnswersCount,
          answers: []
        };
        questionsMap.set(mapKey, question);
      }
  
      // Add the answer to the question's answers array only if BatchName matches
      if (item.AnswerBatchName === batchName) {
        const answer = {
          serialNum: item.AnswerSerialNum,
          Id: item.AnswerId,
          Body: item.AnswerBody,
          ParentId: item.ParentId,
          BatchName: item.AnswerBatchName,
          Score: item.AnswerScore,
          NormalizedScore: item.NormalizedScore,
          AnswerOrder: item.AnswerOrder,
          Label: item.Label,
          LabelRank: item.LabelRank,
          AnswerCreationDate: item.AnswerCreationDate,
        };
        questionsMap.get(mapKey).answers.push(answer);
      }
    });
  
    // Convert the Map to an array of questions
    return Array.from(questionsMap.values());
}