const isLocal = window.location.hostname === "localhost";
const prefix = isLocal ? "http://localhost:3000" : "";
const historyURL = prefix + "/getHistory";
const detailAPI = prefix + "/getDetailEachAnswerOfQuestRankCompare";

historyDATATABLE = null;

$(document).ready(function () {
  $("#loading").show();
  footerHtml();
  getHistoryData();
  Q = JSON.parse(sessionStorage.getItem("questions"));
  getQuestionDetailToModalEvent();
});

function getHistoryData() {
  $.ajax({
    url: historyURL,
    method: "GET",
    data: null,
    contentType: "application/json",
    success: function (response) {
      console.log("AJAX call successful:", response);
      // parse ?
      CreateHistoryDataTable(response.history);
      H = response.history;
    },
    error: function (error) {
      console.error("AJAX call failed:", error);
      $("#loading").hide();
    },
  });
}

function CreateHistoryDataTable(history) {
  $("#loading").hide();
  $("#historyTable").show();
  console.log("History:", history);
  if (!$.fn.DataTable.isDataTable("#historyTable")) {
    historyDATATABLE = $("#historyTable").DataTable({
      data: history,
      columnDefs: [
        { width: "5%", targets: 0 }, // QuestionID
        { width: "5%", targets: 1 }, // RunID
        { width: "20%", targets: 2 }, // ModelName
        { width: "20%", targets: 3 }, // timestamp
        { width: "5%", targets: 4 }, // Temp
        { width: "20%", targets: 5 }, // batchName
        { width: "2%", targets: 6 }, // RankingDifference
      ],
      columns: [
        { data: "QuestionID" },
        { data: "RunID" },
        { data: "ModelName" },
        {
          data: "timestamp",
          render: function (data, type, row) {
            // For display, return the formatted date
            if (type === "display" || type === undefined) {
              return formatDate(data);
            }
            // For sorting and type detection, return the original ISO string
            return data;
          },
        },
        { data: "Temp" },
        { data: "batchName" },
        { data: "RankingDifference" },
        { data: "PromptName" },
      ],
      createdRow: function (row, data, dataIndex) {
        //console.log('Row created:', data);
        $(row).attr("id", `${data.QuestionID}|||${data.RunID}`);
        if (data.RankingDifference == 0) {
          $(row).addClass("good");
        } else if (data.RankingDifference == 2) {
          $(row).addClass("med");
        } else if (data.RankingDifference == 4) {
          $(row).addClass("bad");
        }

        $(row).on("click", function () {
          console.log("Row clicked:", data);
          // Add your click handling logic here
          $("#loading").show();
          $.ajax({
            url: detailAPI,
            method: "POST",
            data: JSON.stringify({
              questionID: data.QuestionID,
              runID: data.RunID,
            }),
            contentType: "application/json",
            success: function (response) {
              console.log("Detail API call successful:", response);
              $("#loading").hide();
              RenderMetaDataToModal(data);
              const resDiff = analyzeRankingDifferences(response.answers);
              renderRankingTable(response.answers, resDiff);
              //console.log('Ranking differences:', analyzeRankingDifferences(response.answers));
              $("#detailsModal").show();
            },
            error: function (error) {
              console.error("Detail API call failed:", error);
              $("#loading").hide();
            },
          });
        });
      },
    });
  }
}

const clacCostForAllExec = () => {
  let hyperSum = 0;
  H.forEach((h) => {
    qId = h.QuestionID;
    question = Q.find((q) => q.Id === qId);
    hyperSum += parseFloat(calcCost(calcTokens(question), h.ModelName));
  });
  return hyperSum;
};

//helpful functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const closeme = (id) => {
  $(`#${id}`).hide();
};

const RenderMetaDataToModal = (data) => {
  $("#modal-questionId").html(data.QuestionID);
  //getQuestionDetailToModalEvent(data.QuestionID);
  $("#modal-runId").html(data.RunID);
  $("#modal-modelName").html(data.ModelName);
  $("#modal-batchName").html(data.batchName);
  $("#modal-temp").html(data.Temp);
  $("#modal-RankingDifference").html(data.RankingDifference);
  if (data.RankingDifference == 0) {
    $("#modal-RankingDifference").css("color", "green");
  } else if (data.RankingDifference == 2) {
    $("#modal-RankingDifference").css("color", "orange");
  } else if (data.RankingDifference == 4) {
    $("#modal-RankingDifference").css("color", "red");
  }
};

const getQuestionDetailToModalEvent = () => {
  $("#modal-questionId").on("click", () => {
    const questionID = parseInt($("#modal-questionId").html());
    const question = Q.find((q) => q.Id === questionID);
    showQuestionDetails(question);
  });
};

function renderRankingTable(rankings, resRankDiff) {
  // Prepare data table array by merging rankings with computed differences
  const tableData = rankings.map((rank) => {
    const matching = resRankDiff.find((r) => r.answerId === rank.AnswerID);
    return {
      id: rank.ID,
      answerId: rank.AnswerID,
      humanRank: rank.HumanRank,
      score: rank.Score,
      aiRank: rank.AiRank,
      positionDiff: matching ? matching.positionDiff : "",
      aiExplanation: rank.AiExplnation,
      status: matching ? matching.status : "",
    };
  });

  // Destroy any existing DataTable instance
  if ($.fn.DataTable.isDataTable("#ranking-table")) {
    $("#ranking-table").DataTable().clear().destroy();
  }

  // Initialize the ranking table as a jQuery DataTable with search and length options disabled
  $("#ranking-table").DataTable({
    data: tableData,
    searching: false,
    lengthChange: false,
    columns: [
      { title: "Exec ID (SQL)", data: "id" },
      { title: "AnswerID", data: "answerId" },
      { title: "Original score", data: "score" },
      { title: "Human Rank (normalized score)", data: "humanRank" },
      { title: "AI Rank", data: "aiRank" },
      { title: "Index Diff", data: "positionDiff" },
      {
        title: "AI Explanation",
        data: "aiExplanation",
        render: function (data) {
          return `<div class="explanation-tooltip" title="${data}">${data.substring(
            0,
            25
          )}...<span class="tooltip-icon">ℹ️</span></div>`;
        },
      },
    ],
    rowCallback: function (row, data) {
      $(row).addClass(data.status);
    },
  });

  // Reinitialize tooltips for the explanation column
  $(".explanation-tooltip").tooltip({
    placement: "top",
    html: true,
    container: "body",
  });
}

function analyzeRankingDifferences(rankings) {
  // Extract and sort human ranks and AI ranks separately
  let humanRanks = rankings.map((r) => r.HumanRank).sort((a, b) => b - a); // Sort descending
  let aiRanks = rankings.map((r) => r.AiRank).sort((a, b) => b - a); // Sort descending

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
  let results = rankings.map((answer) => {
    let humanPosition = humanPositions.get(answer.HumanRank);
    let aiPosition = aiPositions.get(answer.AiRank);
    let positionDiff = Math.abs(humanPosition - aiPosition);

    let status = "good"; // Same position
    if (positionDiff === 1) {
      status = "med"; // 1 position difference
    } else if (positionDiff >= 2) {
      status = "bad"; // 2 or more positions difference
    }

    return {
      answerId: answer.AnswerID,
      humanRank: answer.HumanRank,
      aiRank: answer.AiRank,
      positionDiff: positionDiff,
      status: status,
    };
  });

  return results;
}

// Function to show question details
function showQuestionDetails(question) {
  console.log("showQuestionDetails:", question);
  const tags = parseTags(question.Tags);
  const detailsHTML = `
        <div class="question-details">
            <h2>${question.Title}</h2>
            <p><strong>Question Score:</strong> ${question.Score}</p>
            <p><strong>View Count:</strong> ${question.ViewCount}</p>
            <p><strong>Answer Count:</strong> ${question.AnswerCount}</p>
            <h3>Question Body:</h3>
            <div class="question-body">${formatContent(question.Body)}</div>
            <h3>Tags:</h3>
            <p>${tags
              .map((tag) => `<span class="tag">${tag}</span>`)
              .join(" ")}</p>
            <p>_____________________________________________________________________________</p>
            <h3>Answers:</h3>
            ${question.answers
              .map(
                (answer) => `
                <div class="answer">
                    <div class="answer-header">
                        <span class="answer-score">Score: ${
                          answer.Score
                        } || Normalized Score: ${answer.NormalizedScore} </span>
                        <span class="answer-date">Answered on: ${new Date(
                          parseInt(answer.AnswerCreationDate)
                        ).toLocaleString()}</span>
                    </div>
                    <div class="answer-body">${formatContent(answer.Body)}</div>
                </div>
            `
              )
              .join("")}
        </div>
    `;

  // Create a modal to display question details
  $("<div>")
    .html(detailsHTML)
    .dialog({
      title: "Question Details",
      width: Math.min($(window).width() * 0.8, 800),
      height: Math.min($(window).height() * 0.8, 600),
      modal: true,
      create: function () {
        $(this).css("maxWidth", "100%");
      },
      open: function () {
        $(".ui-widget-overlay").on("click", function () {
          $(this)
            .siblings(".ui-dialog")
            .find(".ui-dialog-content")
            .dialog("close");
        });
      },
    });
}

// Function to parse tags string into an array
function parseTags(tagsString) {
  return tagsString.slice(1, -1).split("><");
}
// Function to format content, handling images and code blocks
function formatContent(content) {
  //console.log('formatContent:', content);
  // Replace image tags with responsive ones
  content = content.replace(/<img[^>]+>/g, function (imgTag) {
    return imgTag
      .replace(/width="[^"]*"/g, 'width="100%"')
      .replace(/height="[^"]*"/g, 'height="auto"');
  });

  // Wrap code blocks with pre tags if not already wrapped
  content = content.replace(
    /<code>([\s\S]*?)<\/code>/g,
    function (match, codeContent) {
      if (match.indexOf("<pre>") === -1) {
        return "<pre><code>" + codeContent + "</code></pre>";
      }
      return match;
    }
  );

  return content;
}

function calcTokens(quest) {
  const unitQuest = quest;
  const answers = unitQuest.answers;
  const question = unitQuest;
  let tokens = 0;

  // Remove <p> tags from question body
  const cleanedQuestionBody = question.Body.replace(/<\/?p>/g, "");
  tokens += cleanedQuestionBody.split(/\s+/).length;

  answers.forEach((answer) => {
    // Remove <p> tags from each answer body
    const cleanedAnswerBody = answer.Body.replace(/<\/?p>/g, "");
    tokens += cleanedAnswerBody.split(/\s+/).length;
  });

  return Math.round(tokens * 1.8) + 2200;
}

function calcCost(tokens, modelName = "gpt-5") {
  const outputTokensAVG = 1911; // average output tokens
  let sum = 0;

  // Verified pricing per 1M tokens
  const modelPricing = {
    // OpenAI
    "gpt-5": { input: 1.25, output: 10 },
    "gpt-3.5-turbo": { input: 3, output: 6 },
    "gpt-4o": { input: 2.5, output: 10 },
    o1: { input: 15, output: 60 }, // Reasoning
    "gpt-4o-mini": { input: 0.75, output: 3 },
    "o1-mini": { input: 7.5, output: 30 },

    // --- ANTHROPIC ---
    "claude-sonnet-4-20250514": { input: 3, output: 15 },
    "claude-3-5-sonnet-20241022": { input: 3, output: 15 },

    // Google Gemini
    "gemini-2.5-flash": { input: 0.3, output: 2.5 },
    "gemini-2.0-flash": { input: 0.3, output: 2.5 },
    "gemini-1.5-flash": { input: 0.3, output: 2.5 },

    // --- DEEPSEEK ---
    "deepseek-chat": { input: 0.27, output: 1.1 },
    "deepseek-coder": { input: 0.55, output: 2.19 },

    // xAI Grok
    "grok-3": { input: 3.0, output: 15.0 },
    "grok-2.0": { input: 2.0, output: 10.0 },
    "grok-4-0709": { input: 3, output: 15 },
  };

  if (modelPricing[modelName]) {
    const { input, output } = modelPricing[modelName];
    const inputCost = (tokens / 1_000_000) * input;
    const outputCost = (outputTokensAVG / 1_000_000) * output;
    sum = inputCost + outputCost;
  } else {
    throw new Error(`Pricing for model "${modelName}" is not defined.`);
  }

  return (sum * 100).toFixed(2); // scaled cost, as per your pattern
}
