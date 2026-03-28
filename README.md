# DataWise — AI Data Analyst

A production-ready AI-powered data analyst web app built with the **FARM stack** (FastAPI + React + MongoDB).

Upload CSV/Excel files, explore your data, and chat with an AI that generates SQL queries and insights in real time.

---

## ✨ Features

- 📤 **Drag & drop file upload** — CSV and Excel support up to 50MB
- 📊 **Data preview** — sortable, scrollable table with column schema
- 💬 **AI chat interface** — ChatGPT-style UI for natural language queries
- 🔍 **SQL generation** — LLM converts questions → DuckDB SQL → results
- 📈 **Charts** — bar/line charts from query results (via Recharts)
- 🌙 **Dark/Light mode** — smooth toggle with CSS variables
- 📥 **Download results** — export as CSV
- 🗃️ **Query history** — persisted per dataset in MongoDB
- ⚡ **Fast** — DuckDB processes queries in-memory

---

## 📁 Folder Structure

```
datawise/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── files.py            # Upload, list, preview, delete
│   │   ├── query.py            # NL query → SQL → results
│   │   └── history.py          # Query & session history
│   ├── services/
│   │   ├── llm_service.py      # OpenAI integration
│   │   └── file_service.py     # File I/O helpers
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   └── utils/
│       ├── database.py         # MongoDB (Motor) connection
│       └── data_processor.py   # Pandas + DuckDB processing
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── App.jsx             # Router + context
        ├── main.jsx
        ├── index.css           # Global styles + CSS variables
        ├── lib/
        │   ├── api.js          # Axios API client
        │   └── utils.js        # Formatters, download helpers
        ├── components/
        │   ├── ui/
        │   │   ├── Layout.jsx      # Sidebar navigation
        │   │   ├── DataTable.jsx   # Sortable data table
        │   │   ├── StatCard.jsx    # Dashboard stat cards
        │   │   ├── Skeleton.jsx    # Loading skeletons
        │   │   └── ColumnPanel.jsx # Schema column list
        │   ├── chat/
        │   │   ├── ChatBubble.jsx  # Message bubbles
        │   │   ├── TypingIndicator.jsx
        │   │   ├── FileSelector.jsx
        │   │   └── ResultChart.jsx
        │   └── upload/
        │       └── FileUpload.jsx  # Drag & drop uploader
        └── pages/
            ├── Dashboard.jsx   # Overview + file list
            ├── Upload.jsx      # Upload + preview
            ├── Chat.jsx        # Main chat interface
            └── Settings.jsx    # API key + theme
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & setup backend

```bash
cd datawise/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL
```

### 2. Start backend

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Setup frontend

```bash
cd datawise/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit VITE_API_URL if backend is not on localhost:8000
```

### 4. Start frontend

```bash
npm run dev
```

App available at: http://localhost:5173

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `datawise` | MongoDB database name |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model to use |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

---

## 🔌 API Routes

### Files

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/files/upload` | Upload CSV/Excel file |
| `GET` | `/api/files/` | List all files |
| `GET` | `/api/files/{file_id}` | Get file metadata |
| `GET` | `/api/files/{file_id}/preview` | Preview data rows |
| `DELETE` | `/api/files/{file_id}` | Delete file |

### Query

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query/ask` | Execute NL query |
| `POST` | `/api/query/session/new` | Create chat session |
| `GET` | `/api/query/session/{id}` | Get session |
| `POST` | `/api/query/session/{id}/message` | Send chat message |

### History

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/history/queries/{file_id}` | Query history |
| `GET` | `/api/history/sessions/{file_id}` | Chat sessions |
| `DELETE` | `/api/history/queries/{file_id}` | Clear history |

---

## 💡 Usage Tips

1. **Set your OpenAI API key** in Settings before querying
2. **Upload your CSV/Excel** from the Upload page
3. **Click "Analyze with AI"** or go to Chat → select your file
4. **Ask natural language questions** like:
   - "What are the top 10 customers by revenue?"
   - "Show me monthly sales trends"
   - "Are there any outliers in the price column?"
   - "What percentage of orders are from each region?"

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Backend | FastAPI, Python 3.10+ |
| AI | OpenAI GPT-4o |
| SQL Engine | DuckDB |
| Data | Pandas |
| Database | MongoDB (Motor async driver) |
| File Upload | python-multipart |
