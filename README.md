# Anbudsgivning

Anbudsgivning is a modular platform for web crawling, data extraction, and tender management, featuring a Python backend, a Next.js frontend, and a suite of agents and browser automation tools.

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [Migration](#migration)
- [Development](#development)

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

- Python 3.13+
- Node.js 22+
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
You have to install CUDA tools separately.

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

4. **Run the backend server & API:**
   ```bash
   cd Backend
   python server.py
   python api.py
   ```
   You can also run both of them through VS Code launch profiles.

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

## 1. Update Environment Variables and Secrets
- Review and update the `.env` file for your environment, secrets, and API keys.
- Change email addresses, encryption keys, and any sensitive information.

## 2. Review and Update Dependencies
- Check `requirements.txt` (backend) and `package.json` (frontend) for dependencies to add, remove, or update.
- Run `pip freeze > requirements.txt` and `npm install` as needed.
- Remove unused packages and add new ones for your use case.

## 3. Database Migration
- Update database connection strings and credentials in your `.env` and config files.
- Backup existing data before making changes.

## 4. Firestore Setup (Optional) (Default database at the moment, add your own if you want)
If you want to use Google Firestore as your database or for specific features, follow these steps:

- Go to https://console.firebase.google.com/ and create a new Firebase project (or use an existing one).
- In the Firebase console, enable Firestore Database for your project.
- Go to Project Settings > Service Accounts and generate a new private key. Download the JSON credentials file.
- Place the credentials file in the root folder of the project.
- Install the required Python package:
  ```bash
  pip install google-cloud-firestore
  ```

**Tip:** Never commit your Firebase credentials file to version control. Add it to your `.gitignore`. The file 'credentials.json' is already added to .gitignore which is supposed to be the Firestore credential file.

---
# Development

This section provides guidance and suggestions for developers who want to contribute to or extend the project. Each main component is described below, along with ideas for further development.

## Agents
Agents are responsible for orchestrating web crawling, data extraction, and communication with other system components. They use multiprocessing and ZeroMQ for distributed operation.

- **Purpose:** Automate the process of crawling tender portals, extracting relevant data, and managing agent lifecycles.
- **Development Suggestions:**
  - Enhance agent error handling and recovery.
  - Add support for new types of agents (e.g., document analyzers, notification agents).
  - Integrate more advanced scheduling or distributed coordination.
  - Improve browser automation integration for more robust crawling.

## Browser
The Browser module provides tools for browser automation, scraping, and interaction with web pages. It leverages Playwright for headless browsing and can use local or hosted AI models for content analysis.

- **Purpose:** Automate web navigation, extract data from dynamic sites, and enable AI-powered summarization or classification of web content.
- **Development Suggestions:**
  - Expand and improve browser-based tests for reliability.
  - Add support for more AI models (e.g., OpenRouter, HuggingFace hosted models).
  - Implement advanced scraping strategies for complex or protected sites.
  - Optimize performance for large-scale crawling.

## Data
The Data module contains data models, AI helpers, and domain-specific logic. It defines the structure of tenders, portals, and other core entities, and provides utilities for AI-driven processing.

- **Purpose:** Define and validate data structures, encapsulate business logic, and provide AI-powered data extraction and transformation.
- **Development Suggestions:**
  - Add or refine Pydantic models for stricter validation.
  - Implement new AI functions for document classification, summarization, or translation.
  - Extend domain logic to support new tender types or business rules.

## Logger
The Logger module provides structured, configurable logging for all components. It supports file rotation, console output, and JSON-formatted logs for easy analysis.

- **Purpose:** Enable robust, structured logging across the system for debugging, monitoring, and auditing.
- **Development Suggestions:**
  - Add more contextual fields to logs (e.g., user/session IDs).
  - Integrate with external log aggregation or monitoring tools.
  - Improve log filtering and verbosity controls.

## Backend
The Backend folder contains the core server logic, API endpoints, and database integration. It manages authentication, business logic, and communication with agents and the database.

- **Purpose:** Serve as the main API and orchestration layer, handling requests from the frontend and coordinating with agents and the database.
- **Development Suggestions:**
  - Add more API endpoints for new features.
  - Improve input validation and error responses.
  - Refactor for better modularity and scalability.
  - Enhance security (rate limiting, stricter auth, etc.).

## Frontend
The frontend is a Next.js React application that provides the user interface for interacting with the system. It communicates with the backend API and presents data to users.

- **Purpose:** Offer a modern, responsive UI for users to view, search, and manage tenders and related data.
- **Development Suggestions:**
  - Add new pages or components for additional features.
  - Improve user experience and accessibility.
  - Integrate real-time updates or notifications.
  - Enhance error handling and feedback for users.

---

**General Tips:**
- Write tests for new features and bug fixes.
- Document your code and update the README as needed.
- Upgrade the Python version for the app when full support for Free-Threaded Mode is added (maybe Python 3.14).
   - Enables true multi-threaded parallelism and improved performance on multi-core systems. Currently in experimental mode.
- For user authentication, use something stronger than just passwords as a new default but use passwords as a fallback.
   - FIDO2 is a great choice for something stronger and safer than regular passwords.