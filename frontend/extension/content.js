function getSentimentCategory(score) {
  if (score >= 0.7) return "Positivo";
  if (score >= 0.4) return "Neutral";
  return "Negativo";
}

const categoryColors = {
  Positivo: "#009c3d",
  Neutral:  "#ffc502",
  Negativo: "#f44336"
};

const btn = document.createElement("button");
btn.textContent = "Analizar Opiniones";
Object.assign(btn.style, {
  position:     "fixed",
  top:          "10px",
  right:        "10px",
  zIndex:       "1000",
  padding:      "8px 12px",
  background:   "#ffba00",
  border:       "none",
  borderRadius: "4px",
  cursor:       "pointer"
});
document.body.appendChild(btn);

const loader = document.createElement("div");
loader.id = "analysis-loader";
loader.textContent = "Analizando opiniones…";
Object.assign(loader.style, {
  position:     "fixed",
  top:          "50px",
  right:        "10px",
  zIndex:       "1000",
  padding:      "8px",
  background:   "rgba(0,0,0,0.7)",
  color:        "white",
  borderRadius: "4px",
  display:      "none",
  fontFamily:   "Arial, sans-serif"
});
document.body.appendChild(loader);

btn.addEventListener("click", () => {
  btn.disabled = true;
  loader.style.display = "block";

  const url = window.location.href;
  const message = { type: "ANALYZE_REVIEWS", url };

  chrome.runtime.sendMessage(message, (response) => {
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

    // console.log("Content received data:", response.data);
    showAnalysisPanel(reviews, keywords, prosSummary, consSummary, aspects);
  });
});

function showAnalysisPanel(reviews, keywords, prosSummary, consSummary, aspects) {
  if (document.getElementById("review-analysis-panel")) return;

  const panel = document.createElement("div");
  panel.id = "review-analysis-panel";
  Object.assign(panel.style, {
    position:     "fixed",
    top:          "90px",
    right:        "10px",
    width:        "340px",
    maxHeight:    "80vh",
    overflowY:    "auto",
    background:   "white",
    border:       "1px solid #ccc",
    borderRadius: "6px",
    boxShadow:    "0 2px 10px rgba(0,0,0,0.2)",
    padding:      "16px",
    zIndex:       "9999",
    fontFamily:   "Arial, sans-serif",
    lineHeight:   "1.4"
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    position:   "absolute",
    top:        "8px",
    right:      "8px",
    border:     "none",
    background: "transparent",
    fontSize:   "16px",
    cursor:     "pointer"
  });
  closeBtn.onclick = () => panel.remove();
  panel.appendChild(closeBtn);

  const avgScore = reviews.reduce((sum, r) => sum + r.sentiment_score, 0) / reviews.length;
  const overallCategory = getSentimentCategory(avgScore);

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

  const prosTitle = document.createElement("h4");
  prosTitle.innerHTML = "<b>Aspectos positivos:</b>";
  panel.appendChild(prosTitle);
  if (prosSummary) {
    const prosPara = document.createElement("p");
    prosPara.textContent = prosSummary;
    panel.appendChild(prosPara);
  } else {
    const noPros = document.createElement("p");
    noPros.textContent = "No se encontraron aspectos positivos.";
    panel.appendChild(noPros);
  }

  panel.appendChild(document.createElement("br"));

  const consTitle = document.createElement("h4");
  consTitle.innerHTML = "<b>Aspectos negativos:</b>";
  panel.appendChild(consTitle);
  if (consSummary) {
    const consPara = document.createElement("p");
    consPara.textContent = consSummary;
    panel.appendChild(consPara);
  } else {
    const noCons = document.createElement("p");
    noCons.textContent = "No se encontraron aspectos negativos.";
    panel.appendChild(noCons);
  }

  panel.appendChild(document.createElement("hr"));

  const aspectTitle = document.createElement("h4");
  aspectTitle.innerHTML = "<b>Sentimiento por aspecto:</b>";
  panel.appendChild(aspectTitle);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.marginBottom = "8px";
  table.innerHTML = `
    <tr>
      <th>Aspecto</th>
      <th style="color:${categoryColors.Positivo}">Pos</th>
      <th style="color:${categoryColors.Neutral}">Neu</th>
      <th style="color:${categoryColors.Negativo}">Neg</th>
    </tr>
    ${Object.entries(aspects).map(([asp, vals]) => `
      <tr>
        <td>${asp}</td>
        <td>${vals.positive}</td>
        <td>${vals.neutral}</td>
        <td>${vals.negative}</td>
      </tr>
    `).join("")}
  `;
  panel.appendChild(table);

  panel.appendChild(document.createElement("hr"));

  const canvas = document.createElement("canvas");
  canvas.id = "sentimentChart";
  canvas.height = 180;
  panel.appendChild(canvas);

  panel.appendChild(document.createElement("br"));

  const kwTitle = document.createElement("h4");
  kwTitle.innerHTML = "<b>Palabras clave:</b>";
  panel.appendChild(kwTitle);

  const kwList = document.createElement("div");
  keywords.forEach(k => {
    const span = document.createElement("span");
    span.textContent = k;
    Object.assign(span.style, {
      display:      "inline-block",
      margin:       "4px 4px 4px 0",
      padding:      "2px 6px",
      background:   "#ffeb99",
      borderRadius: "4px",
      fontSize:     "12px"
    });
    kwList.appendChild(span);
  });
  panel.appendChild(kwList);

  panel.appendChild(document.createElement("hr"));

  const examplesTitle = document.createElement("h4");
  examplesTitle.innerHTML = "<b>Opiniones destacadas:</b>";
  panel.appendChild(examplesTitle);

  const posEx = reviews.filter(r => getSentimentCategory(r.sentiment_score) === "Positivo").slice(0,2);
  posEx.forEach(r => {
    const box = document.createElement("div");
    box.textContent = r.content;
    box.style.borderLeft = `4px solid ${categoryColors.Positivo}`;
    box.style.margin = "4px 0";
    box.style.padding = "4px";
    panel.appendChild(box);
  });

  const negEx = reviews.filter(r => getSentimentCategory(r.sentiment_score) === "Negativo").slice(0,2);
  if (negEx.length) {
    negEx.forEach(r => {
      const box = document.createElement("div");
      box.textContent = r.content;
      box.style.borderLeft = `4px solid ${categoryColors.Negativo}`;
      box.style.margin = "4px 0";
      box.style.padding = "4px";
      panel.appendChild(box);
    });
  } else {
    const noNegEx = document.createElement("p");
    noNegEx.textContent = "No hay opiniones negativas destacadas.";
    panel.appendChild(noNegEx);
  }

  panel.appendChild(document.createElement("hr"));
  const footer = document.createElement("p");
  footer.style.fontSize = "12px";
  footer.style.textAlign = "center";
  footer.innerHTML = `Hecho con ❤️ y ☕ por <a href="https://www.linkedin.com/in/misooler/" target="_blank" style="text-decoration:none;color:#0073b1;">Miguel Soler</a>`;
  panel.appendChild(footer);

  document.body.appendChild(panel);

  const dates = reviews.map(r => r.date);
  const scores = reviews.map(r => r.sentiment_score);

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
