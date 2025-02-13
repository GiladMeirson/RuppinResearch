const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : '';
const historyURL = prefix + '/getHistory';
const detailAPI = prefix + '/getDetailEachAnswerOfQuestRankCompare';


historyDATATABLE = null;


$(document).ready(function() {
    $('#loading').show();
    footerHtml();
    getHistoryData();
});



function getHistoryData() {
    $.ajax({
        url: historyURL,
        method: 'GET',
        data: null,
        contentType: 'application/json',
        success: function(response) {
            console.log('AJAX call successful:', response);
            // parse ?
            CreateHistoryDataTable(response.history)
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}


function CreateHistoryDataTable(history) {
    $('#loading').hide();
    $('#historyTable').show();
    console.log('History:', history);
    if (!$.fn.DataTable.isDataTable('#historyTable'))
    {
        historyDATATABLE = $('#historyTable').DataTable({
            data: history,
            columnDefs: [
                { width: '5%', targets: 0 },  // QuestionID
                { width: '5%', targets: 1 },  // RunID
                { width: '20%', targets: 2 },  // ModelName
                { width: '20%', targets: 3 }, // timestamp
                { width: '5%', targets: 4 }, // Temp
                { width: '20%', targets: 5 },  // batchName
                { width: '2%', targets: 6 },  // RankingDifference
            ],
            columns: [
                { data: 'QuestionID' },
                { data: 'RunID' },
                { data: 'ModelName' },
                { data: 'timestamp',
                    render: function(data) {
                        return formatDate(data);
                    }
                },
                { data: 'Temp' },
                { data: 'batchName' },
                { data: 'RankingDifference' }
            ],
            createdRow: function(row, data, dataIndex) {
                //console.log('Row created:', data);
                $(row).attr('id', `${data.QuestionID}|||${data.RunID}`);
                if (data.RankingDifference == 0) {
                    $(row).addClass('good');
                } else if (data.RankingDifference == 2) {
                    $(row).addClass('med');
                } else if (data.RankingDifference == 4) {
                    $(row).addClass('bad');
                }

                $(row).on('click', function() {
                    console.log('Row clicked:', data);
                    // Add your click handling logic here
                    $('#loading').show();
                    $.ajax({
                        url: detailAPI,
                        method: 'POST',
                        data: JSON.stringify({
                            questionID: data.QuestionID,
                            runID: data.RunID
                        }),
                        contentType: 'application/json',
                        success: function(response) {
                            console.log('Detail API call successful:', response);
                            $('#loading').hide();
                            RenderMetaDataToModal(data);
                            const resDiff = analyzeRankingDifferences(response.answers)
                            renderRankingTable(response.answers,resDiff);
                            //console.log('Ranking differences:', analyzeRankingDifferences(response.answers));
                            $('#detailsModal').show();
                        },
                        error: function(error) {
                            console.error('Detail API call failed:', error);
                            $('#loading').hide();
                        }
                    });
                   
                });
            }
        });
    }

}

















//helpful functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const closeme=(id)=>{
    $(`#${id}`).hide();
}

const RenderMetaDataToModal=(data)=>{
    $('#modal-questionId').html(data.QuestionID)
    $('#modal-runId').html(data.RunID)
    $('#modal-modelName').html(data.ModelName)
    $('#modal-batchName').html(data.batchName)
    $('#modal-temp').html(data.Temp)
    $('#modal-RankingDifference').html(data.RankingDifference)
    if (data.RankingDifference == 0) {
        $('#modal-RankingDifference').css('color', 'green');
    } else if (data.RankingDifference == 2) {
        $('#modal-RankingDifference').css('color', 'orange');
    } else if (data.RankingDifference == 4) {
        $('#modal-RankingDifference').css('color', 'red');
    }
}

function renderRankingTable(rankings, resRankDiff) {
    // Prepare data table array by merging rankings with computed differences
    const tableData = rankings.map(rank => {
        const matching = resRankDiff.find(r => r.answerId === rank.AnswerID);
        return {
            id: rank.ID,
            answerId: rank.AnswerID,
            humanRank: rank.HumanRank,
            aiRank: rank.AiRank,
            positionDiff: matching ? matching.positionDiff : '',
            aiExplanation: rank.AiExplnation,
            status: matching ? matching.status : ''
        };
    });

    // Destroy any existing DataTable instance
    if ($.fn.DataTable.isDataTable('#ranking-table')) {
        $('#ranking-table').DataTable().clear().destroy();
    }

    // Initialize the ranking table as a jQuery DataTable with search and length options disabled
    $('#ranking-table').DataTable({
        data: tableData,
        searching: false,
        lengthChange: false,
        columns: [
            { title: "Exec ID (SQL)", data: "id" },
            { title: "AnswerID", data: "answerId" },
            { title: "Human Rank", data: "humanRank" },
            { title: "AI Rank", data: "aiRank" },
            { title: "Index Diff", data: "positionDiff" },
            { 
                title: "AI Explanation", 
                data: "aiExplanation",
                render: function(data) {
                    return `<div class="explanation-tooltip" title="${data}">${data.substring(0, 25)}...<span class="tooltip-icon">ℹ️</span></div>`;
                }
            }
        ],
        rowCallback: function(row, data) {
            $(row).addClass(data.status);
        }
    });

    // Reinitialize tooltips for the explanation column
    $('.explanation-tooltip').tooltip({
        placement: 'top',
        html: true,
        container: 'body'
    });
}

function analyzeRankingDifferences(rankings) {
    // Extract and sort human ranks and AI ranks separately
    let humanRanks = rankings.map(r => r.HumanRank).sort((a, b) => b - a); // Sort descending
    let aiRanks = rankings.map(r => r.AiRank).sort((a, b) => b - a); // Sort descending
    
    // Create position maps for each answer
    let humanPositions = new Map();
    let aiPositions = new Map();
    
    // Map each rank to its position (0-based index)
    humanRanks.forEach((rank, index) => {
        humanPositions.set(rank, index);
    });
    
    aiRanks.forEach((rank, index) => {
        aiPositions.set(rank, index);
    });
    
    // Analyze each answer's position difference
    let results = rankings.map(answer => {
        let humanPosition = humanPositions.get(answer.HumanRank);
        let aiPosition = aiPositions.get(answer.AiRank);
        let positionDiff = Math.abs(humanPosition - aiPosition);
        
        let status = 'good'; // Same position
        if (positionDiff === 1) {
            status = 'med';  // 1 position difference
        } else if (positionDiff >= 2) {
            status = 'bad';  // 2 or more positions difference
        }
        
        return {
            answerId: answer.AnswerID,
            humanRank: answer.HumanRank,
            aiRank: answer.AiRank,
            positionDiff: positionDiff,
            status: status
        };
    });
    
    return results;
}