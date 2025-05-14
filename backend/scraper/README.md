## Reviews Scrapper Meli

Run service:

```bash
cd backend/nlp/scraper
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```
