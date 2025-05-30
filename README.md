# Anbudsgivning

Anbudsgivning is a modular platform for web crawling, data extraction, and tender management, featuring a Python backend, a Next.js frontend, and a suite of agents and browser automation tools.

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Project](#running-the-project)
- [Testing & Linting](#testing--linting)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [Contact](#contact)
- [Migration](#migration)

---

## Project Structure

```
Anbudsgivning/
│
├── Agents/         # Web crawlers, agent logic, and crawl results
├── Backend/        # FastAPI backend, database, and API logic
├── Browser/        # Browser automation and scraping utilities
├── Data/           # Data models, AI logic, and domain logic
├── Logger/         # Logging utilities and tests
├── frontend/       # Next.js frontend application
```

### Key Components

- **Agents**: Contains web crawlers and agent logic for scraping and processing data.
- **Backend**: FastAPI-based backend with database integration and API endpoints.
- **Browser**: Tools for browser automation and scraping.
- **Data**: Data models (using Pydantic/dataclasses), AI helpers, and domain logic.
- **Logger**: Centralized logging utilities.
- **frontend**: Next.js React frontend for user interaction.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm (comes with Node.js)
- (Recommended) `virtualenv` or `venv` for Python

### AI & GPU Prerequisites

To use the AI features (LLMs, summarization, etc.), you need:

- **NVIDIA GPU** (recommended for large models)
- **CUDA Toolkit** (if you want to use the AI features on your system)
- **PyTorch** with CUDA support
- **bitsandbytes** (for 4-bit quantization, install with CUDA support)
- **transformers** (HuggingFace)
- **pytesseract** and **Pillow** (for OCR features)
- **Ollama** (if using Ollama models via LangChain)

The libraries are installed with pip through the requirements.txt file.
---

## Backend Setup

1. **Navigate to the project root:**
   ```bash
   cd /home/mondus/PythonProjects/Anbudsgivning
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```


4. **Set environment variables:**
   - Create a `.env` file in the `Backend/` directory with your configuration (DB connection, secrets, etc).

5. **Run the backend server:**
   ```bash
   cd Backend
   uvicorn server:app --reload
   ```

---

## Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Running the Project

- **Backend**: Runs on [http://localhost:5001](http://localhost:5001) by default.
- **API**: Runs on [http://localhost:5000](http://localhost:5000) by default.
- **Frontend**: Runs on [http://localhost:3000](http://localhost:3000) by default.

Make sure both backend, API and frontend are running for full functionality.

---

## Environment Variables

Create a `.env` file in the `Backend/` directory. Example:

```
AI_API_KEY= The API key for OpenRouter or whatever AI API provider you choose
SECRET_KEY= Key to encrypt the database
EMAIL_SENDER = The email sender (email send test in main.py)
EMAIL_PASSWORD = The email app password
EMAIL_RECEIVER = The reciever just for test
```

---
# Migration

If you want to migrate this project and make your own version, follow this detailed checklist to ensure a smooth transition:

## 1. Fork or Clone the Repository
- Use GitHub's fork feature or clone the repository to your own workspace.
- Set up your own remote repository if needed.

## 2. Rename the Project
- Update the project name in `README.md`, `package.json` (frontend), and any other relevant files.
- Change directory names and Python package names if desired.
- Search and replace all instances of the old project name in the codebase.

## 3. Update Environment Variables and Secrets
- Review and update the `.env` file for your environment, secrets, and API keys.
- Change email addresses, encryption keys, and any sensitive information.
- Rotate all secrets and never commit sensitive data to version control.

## 4. Reconfigure Backend and Frontend
- Update API endpoints, ports, and URLs in both backend and frontend configs.
- Adjust CORS settings and allowed origins for your deployment domain.
- Update frontend API base URLs in `frontend/src` or config files.

## 5. Review and Update Dependencies
- Check `requirements.txt` (backend) and `package.json` (frontend) for dependencies to add, remove, or update.
- Run `pip freeze > requirements.txt` and `npm install` as needed.
- Remove unused packages and add new ones for your use case.

## 6. Database Migration
- Update database connection strings and credentials in your `.env` and config files.
- If changing the schema, create migration scripts (e.g., with Alembic for SQLAlchemy).
- Backup existing data before making changes.

## 7. Customize Agents, Data Models, and Business Logic
- Modify or extend the agents in `Agents/` to fit your new use case.
- Update or add data models in `Data/models.py` and related files.
- Refactor business logic in `Backend/` and `Data/` as needed.

## 8. Update Logging, Monitoring, and Error Handling
- Adjust logging settings in `Logger/` to match your new environment or preferences.
- Integrate with your preferred monitoring/alerting tools.
- Review and improve error handling for your requirements.

---
