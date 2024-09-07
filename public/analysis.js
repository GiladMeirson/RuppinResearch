canvas = null;
ctx = null;
barChart = null;
detailDataTable = null;
const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : '';
const consistencyURL = prefix + '/getConsistencyModels';
const detailedConsistencyURL = prefix + '/getDetailsConsistencyModels';
const getModelScoresURL = prefix + '/getModelScores';

$(document).ready(function() {
    //$('#loading').show();

    canvas = document.getElementById('myChart');
    $('.container').hide();
    ctx = canvas.getContext('2d');
    
});



function getconsistencyModels(){
    $('#loading').show();
    $.ajax({
        url: consistencyURL,
        method: 'GET',
        data: null,
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            const labels = response.models.map(element => element.ModelName);
            const data = response.models.map(element => element.AveragePercentage);
            drawbarChart(ctx,labels,data);

            
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}
function getmodelsScores(){
    $('#loading').show();
    $.ajax({
        url: getModelScoresURL,
        method: 'GET',
        data: null,
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            console.log('grouped Data', groupByModelName(response.models));
            const normalizeGroupdData = getpercentageOfScoresModels(response.models);
            const groupedData = groupByModelName(response.models);
            

            $('#loading').hide();
            $('.container').fadeIn();
            const colors3 = generateColors(3);
            const colors  = [colors3[0],colors3[0],colors3[0],colors3[1],colors3[1],colors3[1],colors3[2],colors3[2],colors3[2]];
            const labels = response.models.map(element => element.ModelName+' SCORE: '+element.RankingDifference);
            const data = extractValues(normalizeGroupdData);

            console.log('labels',labels,'data',data,'colors',colors);

            if (barChart) {
                barChart.destroy();
            }
            barChart=new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [{
                    label: '% per model',
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                  }]
                },
                options: {
                  scales: {
                    y: {
                      beginAtZero: true
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 16 // Set the font size for x-axis labels here
                            }
                        }
                    }
                  },
                  plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 22 // Set the font size here
                            }
                        }
                    }
                    }
                }
              });

            
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}
function groupByModelName(data) {
    const groupedData = {};

    data.forEach(item => {
        const { ModelName, RankingDifference, count_rank } = item;
        if (!groupedData[ModelName]) {
            groupedData[ModelName] = [];
        }
        groupedData[ModelName].push({ RankingDifference, count_rank });
    });

    return groupedData;
}


function drawbarChart(ctx,labels,data){
    $('#loading').hide();
    $('.container').fadeIn();
    $('#subActions').html('<button class="send-button" onclick="getDetails()" id="getDetails">show details</button>');
    const colors = generateColors(data.length);
    if (barChart) {
        barChart.destroy();
    }
    barChart=new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'percentage of consistency per model',
            data: data,
            backgroundColor: colors,
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            },
            x: {
                ticks: {
                    font: {
                        size: 26 // Set the font size for x-axis labels here
                    }
                }
            }
          },
          plugins: {
            legend: {
                labels: {
                    font: {
                        size: 22 // Set the font size here
                    }
                }
            }
            }
        }
      });
}

function extractValues(obj) {
    const valuesArray = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const nestedObj = obj[key];
            for (const nestedKey in nestedObj) {
                if (nestedObj.hasOwnProperty(nestedKey)) {
                    valuesArray.push(nestedObj[nestedKey]);
                }
            }
        }
    }
    return valuesArray;
}


function getpercentageOfScoresModels(data) {
    const result = {};

    // Group data by ModelName
    const groupedData = data.reduce((acc, item) => {
        if (!acc[item.ModelName]) {
            acc[item.ModelName] = [];
        }
        acc[item.ModelName].push(item);
        return acc;
    }, {});

    // Calculate percentages
    for (const model in groupedData) {
        const total = groupedData[model].reduce((sum, item) => sum + item.count_rank, 0);
        result[model] = groupedData[model].reduce((acc, item) => {
            const percentage = ((item.count_rank / total) * 100).toFixed(2);
            acc[item.RankingDifference] = percentage;
            return acc;
        }, {});
    }

    return result;
}


function generateColors(amount, alpha = 0.5) {
    const mainstreamColors = [
        '255, 99, 132',   // Red
        '54, 162, 235',  // Blue
        '255, 206, 86',  // Yellow
        '75, 192, 192',  // Teal
        '153, 102, 255', // Purple
        '255, 159, 64'   // Orange
    ];
    
    const colors = [];
    for (let i = 0; i < amount; i++) {
        const color = mainstreamColors[i % mainstreamColors.length];
        colors.push(`rgba(${color}, ${alpha})`);
    }
    return colors;
}


function getDetails() {
    //console.log('getDetails');
    $('#loading').show();
    $.ajax({
        url: detailedConsistencyURL,
        method: 'GET',
        data: null,
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            createDetailDataTable(response.models);
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });



    
}

function closeThisId(id) {
    $(id).fadeOut();
}

function createDetailDataTable(data){
    $('#loading').hide();
    
    if (!$.fn.DataTable.isDataTable('#consistencyModelsTable'))
    {
        detailDataTable=$('#consistencyModelsTable').DataTable({
            data: data,
            columnDefs: [
                { width: '3%', targets: 0 },  // QuestionID
                { width: '5%', targets: 1 },  // ModelName
                { width: '3%', targets: 2 },  // RankingDifference
                { width: '3%', targets: 3 }, // Count
                { width: '5%', targets: 4 }, // ConsistencyPercentage
            ],
            columns: [
                { data: 'QuestionID' },
                { data: 'ModelName' },
                { data: 'RankingDifference' },
                { data: 'Count' },
                { data: 'ConsistencyPercentage' },

            ]
        });
        $('#consistencyModelsTableModal').fadeIn();
    }

}