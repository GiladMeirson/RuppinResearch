import Question from './BL/Question.js';

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


export function transformModelData(inputArray) {
  const map = new Map();

  inputArray.forEach(item => {
      const key = `${item.Model1}vs${item.Model2}`;
      if (!map.has(key)) {
          map.set(key, []);
      }
      map.get(key).push({ AlignmentLevel: item.AlignmentLevel, Percentage: item.Percentage });
  });

  const resultArray = Array.from(map.entries()).map(([key, value]) => {
      const [Model1, Model2] = key.split('vs');
      return { Model1, Model2, Alignments: value };
  });

  return resultArray;
}



export function transformQuestionsAndAnswers(data) {
    const questionsMap = Question.createQuestionsMap(data);
    return Array.from(questionsMap.values());
}