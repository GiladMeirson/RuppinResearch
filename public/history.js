const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : '';
const historyURL = prefix + '/getHistory';


historyDATATABLE = null;


$(document).ready(function() {
    $('#loading').show();
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
                if (data.RankingDifference == 0) {
                    $(row).addClass('good');
                } else if (data.RankingDifference == 2) {
                    $(row).addClass('med');
                } else if (data.RankingDifference == 4) {
                    $(row).addClass('bad');
                }
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