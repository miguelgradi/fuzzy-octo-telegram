// content.js

console.log("Content script loaded on", window.location.href);

// Funciones de utilidad para categorizar el sentimiento
function getSentimentCategory(score) {
  if (score >= 0.7) return "Positive";
  if (score >= 0.4) return "Neutral";
  return "Negative";
}

const categoryColors = {
  Positive: "#4caf50",  // verde
  Neutral:  "#ffeb3b",  // amarillo
  Negative: "#f44336"   // rojo
};

// 1) Insertar el botón
const btn = document.createElement("button");
btn.textContent = "Analyze Reviews";
Object.assign(btn.style, {
  position:    "fixed",
  top:         "10px",
  right:       "10px",
  zIndex:      "1000",
  padding:     "8px 12px",
  background:  "#ffba00",
  border:      "none",
  borderRadius:"4px",
  cursor:      "pointer"
});
document.body.appendChild(btn);

// 2) Al hacer click, pedir el análisis
btn.addEventListener("click", () => {
  const url = window.location.href;
  const message = { type: "ANALYZE_REVIEWS", url };
  console.log("Content → background message:", message);

  chrome.runtime.sendMessage(message, (response) => {
    if (!response.success) {
      return alert("Error analyzing reviews: " + response.error);
    }
    const { reviews, top_keywords } = response.data;
    console.log("Content received data:", response.data);
    showAnalysisPanel(reviews, top_keywords);
  });
});

// 3) Crear el panel y renderizar Chart.js + keywords
function showAnalysisPanel(reviews, keywords) {
  // Evitar duplicados
  if (document.getElementById("review-analysis-panel")) return;

  renderPanel();

  function renderPanel() {
    // 3.1) Contenedor principal
    const panel = document.createElement("div");
    panel.id = "review-analysis-panel";
    Object.assign(panel.style, {
      position:     "fixed",
      top:          "50px",
      right:        "10px",
      width:        "320px",
      maxHeight:    "80vh",
      overflowY:    "auto",
      background:   "white",
      border:       "1px solid #ccc",
      borderRadius: "6px",
      boxShadow:    "0 2px 10px rgba(0,0,0,0.2)",
      padding:      "12px",
      zIndex:       "10000",
      fontFamily:   "Arial, sans-serif"
    });

    // 3.2) Botón de cerrar
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    Object.assign(closeBtn.style, {
      position:     "absolute",
      top:          "4px",
      right:        "6px",
      border:       "none",
      background:   "transparent",
      fontSize:     "16px",
      cursor:       "pointer"
    });
    closeBtn.onclick = () => panel.remove();
    panel.appendChild(closeBtn);

    // 3.3) Sentiment overview
    const avgScore = reviews.reduce((sum, r) => sum + r.sentiment_score, 0) / reviews.length;
    const overallCategory = getSentimentCategory(avgScore);
    const overallEl = document.createElement("h3");
    overallEl.textContent = `Overall Sentiment: ${overallCategory}`;
    overallEl.style.color = categoryColors[overallCategory];
    panel.appendChild(overallEl);

    // 3.4) Canvas para Chart.js
    const canvas = document.createElement("canvas");
    canvas.id = "sentimentChart";
    canvas.height = 180;
    panel.appendChild(canvas);

    // 3.5) Lista de keywords
    const kwTitle = document.createElement("h4");
    kwTitle.textContent = "Top Keywords";
    panel.appendChild(kwTitle);

    const kwList = document.createElement("div");
    keywords.forEach(k => {
      const span = document.createElement("span");
      span.textContent = k;
      Object.assign(span.style, {
        display:      "inline-block",
        margin:       "3px",
        padding:      "2px 6px",
        background:   "#ffeb99",
        borderRadius: "4px",
        fontSize:     "12px"
      });
      kwList.appendChild(span);
    });
    panel.appendChild(kwList);

    // Añadir panel al DOM
    document.body.appendChild(panel);

    // 3.6) Renderizar el gráfico con colorizado
    const dates = reviews.map(r => r.date);
    const scores = reviews.map(r => r.sentiment_score);

    new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "Sentiment Score",
          data: scores,
          fill: false,
          tension: 0.1,
          borderColor: categoryColors[overallCategory],
          pointBackgroundColor: scores.map(s => categoryColors[getSentimentCategory(s)])
        }]
      },
      options: {
        scales: {
          y: { min: 0, max: 1 }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}
