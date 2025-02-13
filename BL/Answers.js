export default class Answer {
    constructor(item) {
        this.serialNum = item.AnswerSerialNum;
        this.Id = item.AnswerId;
        this.Body = item.AnswerBody;
        this.ParentId = item.ParentId;
        this.BatchName = item.AnswerBatchName;
        this.Score = item.AnswerScore;
        this.NormalizedScore = item.NormalizedScore;
        this.AnswerOrder = item.AnswerOrder;
        this.Label = item.Label;
        this.LabelRank = item.LabelRank;
        this.AnswerCreationDate = item.AnswerCreationDate;
    }
}
