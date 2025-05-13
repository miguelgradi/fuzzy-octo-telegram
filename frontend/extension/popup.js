document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "ANALYZE_REVIEWS", url: tabs[0].url });
  });

  window.addEventListener("message", (event) => {
    if (event.data.type === "REVIEWS_DATA") {
      const { reviews, top_keywords } = event.data.payload;
      document.getElementById("loader").style.display = "none";
      document.getElementById("content").style.display = "block";
      
      const ctx = document.getElementById("sentimentChart").getContext("2d");
      const chartData = { 
        labels: reviews.map(r => r.date),
        datasets: [{
          label: "Sentiment Score",
          data: reviews.map(r => r.sentiment_score)
        }]
      };
      new Chart(ctx, { type: "line", data: chartData });

      const wc = document.getElementById("wordCloud");
      top_keywords.forEach(k => {
        const span = document.createElement("span");
        span.textContent = k;
        span.style.margin = "0 5px";
        wc.appendChild(span);
      });

      document.getElementById("exportCsv").addEventListener("click", () => {
        const header = ["date","rating","content","useful_count","sentiment_label","sentiment_score"];
        const rows = reviews.map(r => header.map(h => `"${r[h]}"`).join(","));
        const csv = [header.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "reviews_analysis.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  });
});
