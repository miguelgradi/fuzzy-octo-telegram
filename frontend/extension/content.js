function getSentimentCategory(score) {
  if (score >= 0.7) return "Positivo";
  if (score >= 0.4) return "Neutral";
  return "Negativo";
}

const categoryColors = {
  Positivo: "#009c3d",
  Neutral: "#ffc502",
  Negativo: "#f44336"
};

function createUIElements() {
  const btn = document.createElement("button");
  btn.textContent = "Analizar Opiniones";
  Object.assign(btn.style, {
    position: "fixed",
    top: "10px",
    right: "10px",
    zIndex: "1000",
    padding: "8px 12px",
    background: "#ffba00",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "Arial, sans-serif"
  });
  
  const loader = document.createElement("div");
  loader.id = "analysis-loader";
  loader.textContent = "Analizando opiniones…";
  Object.assign(loader.style, {
    position: "fixed",
    top: "50px",
    right: "10px",
    zIndex: "1000",
    padding: "8px",
    background: "rgba(0,0,0,0.7)",
    color: "white",
    borderRadius: "4px",
    display: "none",
    fontFamily: "Arial, sans-serif"
  });
  
  document.body.appendChild(btn);
  document.body.appendChild(loader);
  
  return { btn, loader };
}

function startAnalysis(btn, loader) {
  btn.disabled = true;
  loader.style.display = "block";
  
  const url = window.location.href;
  chrome.runtime.sendMessage(
    { type: "ANALYZE_REVIEWS", url },
    handleAnalysisResponse(btn, loader)
  );
}

function handleAnalysisResponse(btn, loader) {
  return function(response) {
    loader.style.display = "none";
    btn.disabled = false;
    
    if (!response.success) {
      alert("Error al analizar opiniones: " + response.error);
      return;
    }
    
    const {
      reviews,
      top_keywords: keywords,
      pros_summary: prosSummary,
      cons_summary: consSummary,
      aspect_sentiment: aspects
    } = response.data;
    
    showAnalysisPanel(reviews, keywords, prosSummary, consSummary, aspects);
  };
}

function showAnalysisPanel(reviews, keywords, prosSummary, consSummary, aspects) {
  if (document.getElementById("review-analysis-panel")) return;
  
  const labelEl = document.querySelector(".ui-review-capability__rating__label");
  const totalReviews = labelEl 
    ? labelEl.textContent.trim() 
    : "– opiniones";
    
  const avgScore = reviews.reduce((sum, r) => sum + r.sentiment_score, 0) / reviews.length;
  const overallCategory = getSentimentCategory(avgScore);
  
  const panel = createPanelElement();
  
  addPanelHeader(panel, totalReviews, overallCategory);
  addProsAndCons(panel, prosSummary, consSummary);
  addAspectSentiment(panel, aspects);
  addSentimentChart(panel, reviews);
  addKeywords(panel, keywords);
  addHighlightedReviews(panel, reviews);
  addFooter(panel);
  
  document.body.appendChild(panel);
}

function createPanelElement() {
  const panel = document.createElement("div");
  panel.id = "review-analysis-panel";
  Object.assign(panel.style, {
    position: "fixed",
    top: "90px",
    right: "10px",
    width: "340px",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "6px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    padding: "16px",
    zIndex: "9999",
    fontFamily: "Arial, sans-serif",
    lineHeight: "1.4"
  });
  
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "8px",
    right: "8px",
    border: "none",
    background: "transparent",
    fontSize: "16px",
    cursor: "pointer"
  });
  closeBtn.onclick = () => panel.remove();
  panel.appendChild(closeBtn);
  
  return panel;
}

function addPanelHeader(panel, totalReviews, overallCategory) {
  const totalEl = document.createElement("p");
  totalEl.innerHTML = `<b>Total de opiniones:</b> ${totalReviews}`;
  totalEl.style.marginBottom = "8px";
  panel.appendChild(totalEl);
  
  const overallEl = document.createElement("h3");
  overallEl.textContent = `Sentimiento general: ${overallCategory}`;
  overallEl.style.color = categoryColors[overallCategory];
  panel.appendChild(overallEl);
  
  const legend = document.createElement("p");
  legend.innerHTML = `
    La puntuación va de <strong>0.0</strong> (muy negativo) a <strong>1.0</strong> (muy positivo).<br>
    <span style="color:${categoryColors.Positivo}">Verde (≥0.7) = Positivo</span>, 
    <span style="color:${categoryColors.Neutral}">Amarillo (0.4–0.7) = Neutral</span>, 
    <span style="color:${categoryColors.Negativo}">Rojo (<0.4) = Negativo</span>.
  `;
  legend.style.fontSize = "12px";
  legend.style.margin = "8px 0";
  panel.appendChild(legend);
  
  panel.appendChild(document.createElement("hr"));
}

function addProsAndCons(panel, prosSummary, consSummary) {
  const prosTitle = document.createElement("h4");
  prosTitle.innerHTML = "<b>Aspectos positivos:</b>";
  panel.appendChild(prosTitle);
  
  const prosPara = document.createElement("p");
  prosPara.textContent = prosSummary || "No se encontraron aspectos positivos.";
  panel.appendChild(prosPara);
  
  panel.appendChild(document.createElement("br"));
  
  const consTitle = document.createElement("h4");
  consTitle.innerHTML = "<b>Aspectos negativos:</b>";
  panel.appendChild(consTitle);
  
  const consPara = document.createElement("p");
  consPara.textContent = consSummary || "No se encontraron aspectos negativos.";
  panel.appendChild(consPara);
  
  panel.appendChild(document.createElement("hr"));
}

function addAspectSentiment(panel, aspects) {
  const aspectTitle = document.createElement("h4");
  aspectTitle.innerHTML = "<b>Sentimiento por aspecto:</b>";
  panel.appendChild(aspectTitle);
  
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.marginBottom = "8px";
  
  let tableHTML = `
    <tr>
      <th>Aspecto</th>
      <th style="color:${categoryColors.Positivo}">Pos</th>
      <th style="color:${categoryColors.Neutral}">Neu</th>
      <th style="color:${categoryColors.Negativo}">Neg</th>
    </tr>
  `;
  
  Object.entries(aspects).forEach(([aspect, values]) => {
    tableHTML += `
      <tr>
        <td>${aspect}</td>
        <td>${values.positive}</td>
        <td>${values.neutral}</td>
        <td>${values.negative}</td>
      </tr>
    `;
  });
  
  table.innerHTML = tableHTML;
  panel.appendChild(table);
  
  panel.appendChild(document.createElement("hr"));
}

function addSentimentChart(panel, reviews) {
  const canvas = document.createElement("canvas");
  canvas.id = "sentimentChart";
  canvas.height = 180;
  panel.appendChild(canvas);
  panel.appendChild(document.createElement("br"));
  
  const dates = reviews.map(r => r.date);
  const scores = reviews.map(r => r.sentiment_score);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const overallCategory = getSentimentCategory(avgScore);
  
  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Puntuación de sentimiento",
        data: scores,
        fill: false,
        tension: 0.1,
        borderColor: categoryColors[overallCategory],
        pointBackgroundColor: scores.map(s => categoryColors[getSentimentCategory(s)])
      }]
    },
    options: {
      scales: { y: { min: 0, max: 1 } },
      plugins: { legend: { display: false } }
    }
  });
}

function addKeywords(panel, keywords) {
  const kwTitle = document.createElement("h4");
  kwTitle.innerHTML = "<b>Palabras clave:</b>";
  panel.appendChild(kwTitle);
  
  const kwList = document.createElement("div");
  keywords.forEach(keyword => {
    const span = document.createElement("span");
    span.textContent = keyword;
    Object.assign(span.style, {
      display: "inline-block",
      margin: "4px 4px 4px 0",
      padding: "2px 6px",
      background: "#ffeb99",
      borderRadius: "4px",
      fontSize: "12px"
    });
    kwList.appendChild(span);
  });
  panel.appendChild(kwList);
  
  panel.appendChild(document.createElement("hr"));
}

function addHighlightedReviews(panel, reviews) {
  const examplesTitle = document.createElement("h4");
  examplesTitle.innerHTML = "<b>Opiniones destacadas:</b>";
  panel.appendChild(examplesTitle);
  
  const positiveReviews = reviews
    .filter(r => getSentimentCategory(r.sentiment_score) === "Positivo")
    .slice(0, 2);
    
  positiveReviews.forEach(review => {
    addReviewBox(panel, review, categoryColors.Positivo);
  });
  
  const negativeReviews = reviews
    .filter(r => getSentimentCategory(r.sentiment_score) === "Negativo")
    .slice(0, 2);
    
  if (negativeReviews.length) {
    negativeReviews.forEach(review => {
      addReviewBox(panel, review, categoryColors.Negativo);
    });
  } else {
    const noNegEx = document.createElement("p");
    noNegEx.textContent = "No hay opiniones negativas destacadas.";
    panel.appendChild(noNegEx);
  }
  
  panel.appendChild(document.createElement("hr"));
}

function addReviewBox(panel, review, color) {
  const box = document.createElement("div");
  box.textContent = review.content;
  box.style.borderLeft = `4px solid ${color}`;
  box.style.margin = "4px 0";
  box.style.padding = "4px";
  panel.appendChild(box);
}

function addFooter(panel) {
  const footer = document.createElement("p");
  footer.style.fontSize = "12px";
  footer.style.textAlign = "center";
  footer.innerHTML = `
    Hecho con ❤️ y ☕ por 
    <a href="https://www.linkedin.com/in/misooler/" 
       target="_blank" 
       style="text-decoration:none;color:#0073b1;">
      Miguel Soler
    </a>
  `;
  panel.appendChild(footer);
}

(function init() {
  const { btn, loader } = createUIElements();
  btn.addEventListener("click", () => startAnalysis(btn, loader));
})();