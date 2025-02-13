import Answer from './Answers.js';

class Question {
    constructor(item) {
        this.serialNum = item.serialNum;
        this.Id = item.Id;
        this.Title = item.Title;
        this.CreationDate = item.creationDate;
        this.Score = item.Score;
        this.ViewCount = item.ViewCount;
        this.AnswerCount = item.AnswerCount;
        this.Tags = item.Tags;
        this.Body = item.Body;
        this.BatchName = item.BatchName;
        this.modelName = item.modelName;
        this.temp = item.Temperature;
        this.MismatchScore = item.MismatchScore;
        this.MatchQuality = item.MatchQuality;
        this.ProcessedAnswersCount = item.ProcessedAnswersCount;
        this.answers = [];
    }

    addAnswer(item) {
        if (item.AnswerBatchName === this.BatchName) {
            const answer = new Answer(item);
            this.answers.push(answer);
        }
    }

    static getMapKey(questionId, batchName) {
        return `${questionId}-${batchName}`;
    }

    static createQuestionsMap(data) {
        const questionsMap = new Map();
        
        data.forEach(item => {
            const mapKey = this.getMapKey(item.Id, item.BatchName);
            
            if (!questionsMap.has(mapKey)) {
                const question = new Question(item);
                questionsMap.set(mapKey, question);
            }
            
            questionsMap.get(mapKey).addAnswer(item);
        });

        return questionsMap;
    }
}

export default Question;