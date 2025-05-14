# Analizador de Opiniones de Mercado Libre

Extensión de Chrome + API en FastAPI para scrapear y analizar reseñas de productos en Mercado Libre.

![Demo](assets/test.gif)

## 📄 Índice

- [Descripción General](#-descripción-general)
- [Arquitectura y Componentes](#-arquitectura-y-componentes)
- [Detalle de Scripts](#-detalle-de-scripts)
- [Pipelines y Algoritmos NLP](#-pipelines-y-algoritmos-nlp)
- [API REST (FastAPI)](#-api-rest-fastapi)
- [Extensión de Chrome](#-extensión-de-chrome)
- [Estadísticas y Cálculos](#-estadísticas-y-cálculos)
- [Imágenes en el README](#-imágenes-en-el-readme)
- [Licencia](#-licencia)
- [Créditos](#-créditos)

## 🧐 Descripción General

Este proyecto permite:

- Scrapear opiniones de productos en Mercado Libre (popup de reseñas).
- Analizar sentimiento global y por review.
- Extraer palabras clave (YAKE).
- Resumir pros y contras (BART).
- Desglosar sentimiento por aspecto (Envío, Calidad, Empaque).
- Mostrar resultados en una extensión de Chrome.

## 🏗 Arquitectura y Componentes

```
Extensión Chrome ⇄ background.js ⇄ API FastAPI ⇄ scrape_reviews.py + analysis.py ⇄ Modelos HF + YAKE
```

**Extensión de Chrome**

- `content.js`: inyecta botón y panel en la página.
- `background.js`: gestiona mensajes y llamadas HTTP.

**API (FastAPI)**

- `api.py`: define endpoints `/scrape` y `/analyze`.

**Scraper**

- `scrape_reviews.py`: Playwright abre popup y BeautifulSoup extrae reseñas.

**Análisis NLP**

- `analysis.py`: pipelines de Hugging Face y YAKE.

## 📝 Detalle de Scripts

### scrape_reviews.py

**Objetivo**: Cargar el popup de reseñas y extraer datos.

**Funciones**:

- `fetch_page_content(url)`: abre URL, clic en "Mostrar todas las opiniones" y devuelve HTML.
- `parse_reviews(html)`: parsea HTML con BeautifulSoup y extrae:
  - `date` (fecha)
  - `rating` (número de estrellas)
  - `content` (texto de la reseña)
  - `useful_count` (veces marcado como útil)
- `scrape_reviews(url)`: orquesta fetch + parse.

### analysis.py

**Objetivo**: Aplicar NLP sobre lista de reseñas.

**Funciones principales**:

- `analyze_sentiment(text)`: BERT multilingüe → label, score, category.
- `extract_keywords(texts)`: YAKE → top-10 bigramas.
- `summarize_texts(texts)`: BART → resumen de pros o contras.
- `aspect_sentiment(reviews)`: cuenta Pos/Neu/Neg por aspecto (Envío, Calidad, Empaque).
- `analyze_reviews(reviews)`: devuelve un objeto con:

```json
{
  "reviews": [...],
  "top_keywords": [...],
  "pros_summary": "...",
  "cons_summary": "...",
  "aspect_sentiment": { "Envío": {...}, "Calidad": {...}, "Empaque": {...} }
}
```

### api.py

**Objetivo**: Exponer endpoints HTTP.

**Endpoints**:

- **POST /scrape**

  - Request:

  ```json
  { "url": "https://articulo.mercadolibre.com.co/MLC-XXXXXXX" }
  ```

  - Response:

  ```json
  [
    { "date": "...", "rating": 5, "content": "...", "useful_count": 12 },
    ...
  ]
  ```

- **POST /analyze**
  - Request: igual a /scrape.
  - Response:
  ```json
  {
    "reviews": [...],
    "top_keywords": [...],
    "pros_summary": "...",
    "cons_summary": "...",
    "aspect_sentiment": { ... }
  }
  ```

## 🤖 Pipelines y Algoritmos NLP

| Tarea                   | Herramienta / Modelo                             |
| ----------------------- | ------------------------------------------------ |
| Análisis de Sentimiento | nlptown/bert-base-multilingual-uncased-sentiment |
| Extracción de Keywords  | YAKE (español, n-gramas=2, top=10)               |
| Resumen Pros/Contras    | facebook/bart-large-cnn                          |
| Sentimiento por Aspecto | Búsqueda de keywords + conteo de categorías      |

**Categorización de score**:

- score ≥ 0.7 → Positivo
- 0.4 ≤ score < 0.7 → Neutral
- score < 0.4 → Negativo

## 🚀 API REST (FastAPI)

**Instalar dependencias**

```bash
pip install -r requirements.txt
```

**Configurar variable**

```bash
export TOKENIZERS_PARALLELISM=false
```

**Levantar servidor**

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

## 🔌 Extensión de Chrome

1. Abrir `chrome://extensions`.
2. Activar Modo desarrollador.
3. Cargar carpeta `extension/` con Load unpacked.
4. Navegar a un producto de Mercado Libre y hacer clic en Analizar Opiniones.

## 📊 Estadísticas y Cálculos

**Puntaje promedio**:

```javascript
const avg =
  reviews.reduce((sum, r) => sum + r.sentiment_score, 0) / reviews.length;
```

**Resumen**: toma hasta 1000 caracteres concatenados antes de resumir.

**Sentimiento por aspecto**:

```python
for aspect,kws in ASPECT_KEYWORDS.items():
    hits=[r for r in reviews if any(k in r["content"].lower() for k in kws)]
    positive = sum(r["sentiment_category"]=="Positive" for r in hits)
    ...
```

**YAKE**: extrae términos relevantes evitando stop-words.

## Configuración del servidor

Por defecto el servidor se ejecuta en localhost:8000. Para cambiar el host o puerto, edita el comando de arranque en api.py o usa variables de entorno:

```bash
# Con uvicorn directamente:
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# O exporta antes:
export API_HOST=mi-dominio.com
export API_PORT=8080
uvicorn api:app --host $API_HOST --port $API_PORT --reload
```

![Popup](assets/image-1.png)

## 📜 Licencia

Este proyecto está bajo la MIT License.

## 🤝 Contribuciones

¡Bienvenido! Abre un issue o un pull request para sugerir mejoras.

## ❤️☕ Créditos

Hecho con ❤️ y ☕ por [Miguel Soler](https://www.linkedin.com/in/misooler/)
