document.addEventListener("DOMContentLoaded", initializePopup);


function initializePopup() {
  requestReviewAnalysis();
  setupMessageListener();
}

function requestReviewAnalysis() {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    const url = tabs[0].url;
    console.log("Popup → background", url);
    
    chrome.runtime.sendMessage(
      {type: "ANALYZE_REVIEWS", url}, 
      handleBackgroundResponse
    );
  });
}

/**
 * Handles the response from the background script
 * @param {Object} response - Response from the background script
 */
function handleBackgroundResponse(response) {
  console.log("Popup got response:", response);
}

function setupMessageListener() {
  window.addEventListener("message", event => {
    if (event.data.type === "REVIEWS_DATA") {
      displayReviewData(event.data.payload);
    }
  });
}

/**
 * Displays the analysis data in the interface
 * @param {Object} payload - Opinion analysis data
 */
function displayReviewData(payload) {
  const { reviews, top_keywords } = payload;
  
  hideElement("loader");
  showElement("content");
  
  createSentimentChart(reviews);
  
  displayWordCloud(top_keywords);
}

/**
 * Creates the sentiment chart
 * @param {Array} reviews - Array of reviews with scores
 */
function createSentimentChart(reviews) {
  const ctx = document.getElementById("sentimentChart").getContext("2d");
  
  const chartData = { 
    labels: reviews.map(review => review.date),
    datasets: [{
      label: "Sentiment Score",
      data: reviews.map(review => review.sentiment_score)
    }]
  };
  
  new Chart(ctx, { 
    type: "line", 
    data: chartData 
  });
}

/**
 * Displays the keyword cloud
 * @param {Array} keywords - Array of keywords
 */
function displayWordCloud(keywords) {
  const wordCloudElement = document.getElementById("wordCloud");
  
  keywords.forEach(keyword => {
    const span = document.createElement("span");
    span.textContent = keyword;
    span.style.margin = "0 5px";
    wordCloudElement.appendChild(span);
  });
}

/**
 * Hides a DOM element
 * @param {string} elementId - ID of the element to hide
 */
function hideElement(elementId) {
  document.getElementById(elementId).style.display = "none";
}

/**
 * Shows a DOM element
 * @param {string} elementId - ID of the element to show
 */
function showElement(elementId) {
  document.getElementById(elementId).style.display = "block";
}