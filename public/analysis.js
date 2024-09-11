canvas = null;
canvas2=null;
canvas3=null;
ctx = null;
ctx2=null;
ctx3=null;
barChart = null;
arrayOfCharts =[];
detailDataTable = null;
const isLocal = window.location.hostname === 'localhost';
const prefix = isLocal? 'http://localhost:3000' : '';
const consistencyURL = prefix + '/getConsistencyModels';
const detailedConsistencyURL = prefix + '/getDetailsConsistencyModels';
const getModelScoresURL = prefix + '/getModelScores';
const getCoherencyBetweenModelsURL = prefix + '/getCoherencyBetweenModels';

$(document).ready(function() {
    //$('#loading').show();

    canvas = document.getElementById('myChart');
    canvas1 = document.getElementById('myChart1');
    canvas2 = document.getElementById('myChart2');
    canvas3 = document.getElementById('myChart3');
    hideCTX();

    $('.container').hide();
    ctx = canvas.getContext('2d');
    ctx1 = canvas1.getContext('2d');
    ctx2 = canvas2.getContext('2d');
    ctx3 = canvas3.getContext('2d');

    
});



//inter model 
function getconsistencyModels(){
    $('#loading').show();
    let domain = $('#selectDomain').val();
    domain = domain === 'ALL' ? '' : domain;
    const data = { domain };
    console.log('data',data);
    $.ajax({
        url: consistencyURL,
        method: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            const labels = response.models.map(element => element.ModelName);
            const data = response.models.map(element => element.AveragePercentage);
            hideCTX()
            drawbarChart(ctx,labels,data);

            
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}


//WOC
function getmodelsScores(){
    $('#loading').show();
    let domain = $('#selectDomain').val();
    domain = domain === 'ALL' ? '' : domain;
    const data = { domain };
    hideCTX();
    $.ajax({
        url: getModelScoresURL,
        method: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            //console.log('grouped Data', groupByModelName(response.models));
            const normalizeGroupdData = getpercentageOfScoresModels(response.models);
            const groupedData = groupByModelName(response.models);
            

            $('#loading').hide();
            $('.container').fadeIn();
            const labels = response.models.map(element => element.ModelName+' SCORE: '+element.RankingDifference);
            const data = extractValues(normalizeGroupdData);

            //console.log('groupedData',groupedData,data);
            let keys = Object.keys(groupedData);
            let values = Object.values(groupedData);
            console.log('keys',keys,data);
            hideCTX();
            ClearContextCTX();


            drawOnePieChartWOC(ctx1,keys[0],[data[0],data[1],data[2]]);
            drawOnePieChartWOC(ctx2,keys[1],[data[3],data[4],data[5]]);
            drawOnePieChartWOC(ctx3,keys[2],[data[6],data[7],data[8]]);
            $('#myChart1').fadeIn();
            $('#myChart2').fadeIn();
            $('#myChart3').fadeIn();
            
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}

//inter coherency models
function getCoherencyBetweenModels(){
    $('#loading').show();
    let domain = $('#selectDomain').val();
    domain = domain === 'ALL' ? '' : domain;
    const data = { domain };
    $.ajax({
        url: getCoherencyBetweenModelsURL,
        method: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            
            console.log('AJAX call successful:', response.models);
            drawMultiPieChart(response.models);
          

            
            
        },
        error: function(error) {
            console.error('AJAX call failed:', error);
            $('#loading').hide();
            
        }
    });
}





function drawMultiPieChart(arrayOfData){
    $('#loading').hide();
    $('.container').fadeIn();
    hideCTX();
    ClearContextCTX();
    arrayOfCharts=[];
    $('#myChart').hide();
    $('#myChart1').fadeIn();
    $('#myChart2').fadeIn();
    $('#myChart3').fadeIn();
    drawOnePieChart(ctx1,arrayOfData[0]);
    drawOnePieChart(ctx2,arrayOfData[1]);
    drawOnePieChart(ctx3,arrayOfData[2]);


}

function drawOnePieChart(ctx,data){
    const Data = {
        labels: [data.Alignments[0].AlignmentLevel,data.Alignments[1].AlignmentLevel,data.Alignments[2].AlignmentLevel],
        datasets: [{
          label: ``,
          data: [data.Alignments[0].Percentage,data.Alignments[1].Percentage,data.Alignments[2].Percentage],
          backgroundColor: [
            '#a2ff88',
            '#fff588',
            '#ff9c9c'
          ],
          hoverOffset: 4
        }]
    };
    const config = {
        type: 'pie',
        data: Data,
        options: {
            plugins: {
                title: {
                    display: true,
                    text: `Coherency between ${data.Model1} and ${data.Model2}`,
                    font: {
                        size: 22
                    }
                }
            }
        }
    };
    arrayOfCharts.push(new Chart(ctx, config));
 

}

function drawOnePieChartWOC(ctx,model,Dataa){
    const Data = {
        labels: ['SCORE : 0','SCORE : 1','SCORE : 2'],
        datasets: [{
          label: ``,
          data: Dataa,
          backgroundColor: [
            '#a2ff88',
            '#fff588',
            '#ff9c9c'
          ],
          hoverOffset: 4
        }]
    };
    const config = {
        type: 'pie',
        data: Data,
        options: {
            plugins: {
                title: {
                    display: true,
                    text: `${model}`,
                    font: {
                        size: 22
                    }
                }
            }
        }
    };
    arrayOfCharts.push(new Chart(ctx, config));
 

}


function drawbarChart(ctx,labels,data){
    $('#loading').hide();
    $('.container').fadeIn();
    $('#myChart').fadeIn();
    const colors = generateColors(data.length);
    // if (barChart) {
    //     barChart.destroy();
    // }
    ClearContextCTX();
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
    arrayOfCharts=[];
    arrayOfCharts.push(barChart);
}


function hideCTX(){
    $('#myChart').hide();
    $('#myChart1').hide();
    $('#myChart2').hide();
    $('#myChart3').hide();
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

function ClearContextCTX(){
    if (arrayOfCharts.length>0){
        arrayOfCharts.forEach(chart => {
            chart.destroy();
        }
        );
    }
    arrayOfCharts=[];
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