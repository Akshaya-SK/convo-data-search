# convo-data-search

Conversational Data Search — chat with CSVs, get text answers, tables, and charts.

## Tagline
Chat with your CSVs — React + Vanilla CSS + Express. LLM optional (backend returns a JSON "plan" the frontend executes).

## Tech
- React (Vite)
- Plain CSS (no Tailwind)
- Express (Node)
- Chart.js
- PapaParse
- Optional: OpenAI (if you supply `OPENAI_API_KEY`)

## Quickstart

Requirements: Node >= 18, npm

```bash
# server
cd server
cp .env.example .env
# optionally set OPENAI_API_KEY in .env
npm install
npm run dev

# client
cd ../client
npm install
npm run dev
```