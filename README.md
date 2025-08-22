# CONVERSATIONAL DATA SEARCH APPLICATION 

A **React + Node.js** project that allows users to upload CSV files, process them on the backend, and view analysis results on the frontend.
🚧 **Currently in progress** — more features will be added soon!

## Project Structure
```php
convo-data-search/
│
├── client/                     # React frontend
│   ├── public/                 
│   │   ├── assets/             # Static assets
│   │   │   └── logo.svg
│   │   └── sample/             # Example CSV files
│   │       └── sales.csv
│   │
│   ├── src/                    
│   │   ├── styles/             # Global styles
│   │   │   └── global.css
│   │   ├── lib/                # Utility scripts
│   │   │   ├── csv.js
│   │   │   └── execPlan.js
│   │   ├── components/         # Reusable UI components
│   │   │   ├── UploadBox.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── ResultPanel.jsx
│   │   │   └── DataPreview.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── index.js            # Main Express server
│   │   ├── routes/             # API endpoints
│   │   │   └── plan.js
│   │   └── services/           # Business logic
│   │       └── planner.js
│   │
│   └── .env.example            # Example environment variables
│
└── README.md                   # Documentation

```
## Features (in progress)
✅ Upload CSV files via frontend
✅ Preview data in a table-like UI
✅ Backend API for parsing and analysis
🚧 Generate query-based execution plans (planner.js)
🚧 Interactive chat-like interface for querying data
🚧 More advanced data summaries (mean, variance, std, etc.)

## Tech Stack
**Frontend**: React.js (with plain CSS)
**Backend**: Node.js + Express
**File Uploads**: Multer
**CSV Parsing**: csv-parse

## Getting Started

### 1.Clone the repo
```bash
git clone https://github.com/your-username/convo-data-search.git
cd convo-data-search
```

### 2. Install dependencies
**Frontend**
```bash
cd client
npm install
```
**Backend**
```bash
cd ../server
npm install
```

### 3. Run the app
**Start backend (from server/)**'
```bash
npm start
```

**Start frontend (from client/)**'
```bash
npm start
```

Frontend runs on http://localhost:3000
Backend runs on http://localhost:5000

## Status
This project is **still under development**.
Planned improvements:
API documentation for analysis endpoints
Richer data visualizations in frontend
Chat-driven data exploration flow
