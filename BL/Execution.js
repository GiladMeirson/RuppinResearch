export default class Execution {
    constructor(row) {
        this.QuestionID = row.QuestionID;
        this.RunID = row.RunID;
        this.ModelName = row.ModelName;
        this.timestamp = row.timestamp;
        this.Temp = row.Temp;
        this.batchName = row.batchName;
        this.RankingDifference = row.RankingDifference;
    }
    static fromDB(row) {
        console.log(row);
        return new Execution(row);
    }
}

