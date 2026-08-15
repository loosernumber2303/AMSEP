# AMASEP: Autonomous Multi-Agent Software Engineering Platform

AMASEP is an intelligent software development platform designed as a 4th-year major project. It automates the software development lifecycle: translation of natural-language requirements into structure, code generation, sandboxed test execution, and iterative corrections.

## Project Structure

```text
├── backend/          # FastAPI Python Backend
│   ├── app/          # API & Orchestrator Logic
│   └── tests/        # PyTest suite for backend endpoints
└── frontend/         # React + TS + Tailwind CSS dashboard
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Docker (for execution sandbox in Phase 4+)

### Backend Setup
1. Change directory to `backend`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and configure it:
   ```bash
   cp ../.env.example .env
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend server will start on [http://localhost:8000](http://localhost:8000) with interactive documentation available at `/docs`.

### Frontend Setup
1. Change directory to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The dashboard will open at [http://localhost:5173](http://localhost:5173).
