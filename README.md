# Recursive Understanding Engine (RUE)
### A System That Ensures True Conceptual Clarity
> Hackathon Project — Sponsor: BuilderThinking

---

## Project Overview

**RUE** is a web-based intelligent learning system that transforms how users understand complex concepts.
Unlike a chatbot that just answers questions, RUE recursively breaks knowledge into layers — ensuring
the user truly understands every building block of an answer, not just the surface-level response.

---

## Problem Analysis

| Assumption Most Systems Make        | What RUE Challenges                                          |
|-------------------------------------|--------------------------------------------------------------|
| "Answer given = Understanding achieved" | Understanding only happens when every key term is understood |
| Linear Q&A flow                     | Recursive, tree-like exploration                             |
| One-shot explanation                | Multi-depth, layered clarification                           |

> The core challenge is NOT the chatbot part. It is the **concept identification + recursive depth design**.

---

## Architecture Overview

```
User Query
    ↓
LLM Answer Generation (Groq — llama-3.3-70b-versatile)
    ↓
Concept Extraction Engine  ← (THE CRITICAL PIECE)
    ↓
Highlighted Clickable Terms in Answer (with Difficulty Badges)
    ↓
User clicks a Term
    ↓
Focused Sub-Explanation (new LLM call, scoped to that term)
    ↓
New Terms Extracted from Sub-Explanation
    ↓
Recursive Loop continues...
    ↓
User marks "Got it" → Exploration ends / "Explore Further" → continues
```

---

## Tech Stack

| Layer                | Technology                        | Why                                              |
|----------------------|-----------------------------------|--------------------------------------------------|
| **Frontend**         | React.js + TailwindCSS            | Component-based, clean UI, fast rendering        |
| **Backend**          | FastAPI (Python)                  | Lightweight, async, easy LLM integration         |
| **LLM**              | Groq API (llama-3.3-70b)          | Fast inference, free tier, structured reasoning  |
| **Vision LLM**       | Groq (llama-4-scout-17b)          | Image/PDF analysis                               |
| **State Management** | Zustand                           | Track exploration depth, breadcrumb history      |
| **Database**         | PostgreSQL (Render)               | User auth and session persistence                |
| **Auth**             | JWT tokens + sha256_crypt         | Secure, stateless authentication                 |
| **Deployment**       | Render (backend) + Vercel (frontend) | Free tier, fast deploy                        |

---

## Key Features

### 1. Smart Concept Identification Engine
- Uses a **dedicated LLM prompt** to extract only meaningful, domain-relevant terms
- Filters out common words (`is`, `the`, `that`)
- Returns terms with **difficulty levels** (Beginner / Intermediate / Advanced)
- Highlights them visually inside the answer text as colored badges

### 2. Recursive Exploration Tree
- Every term click spawns a **new scoped explanation**
- Each explanation generates its own new clickable terms
- Users can go **N levels deep**
- A **breadcrumb trail** shows the path: `LIME → Model-Agnostic → Internal Structure`

### 3. Concept Difficulty Badges
- Every term shows a difficulty pip: **B** (green), **I** (violet), **A** (red)
- Helps users prioritize which concepts to explore first
- Shown both inline in the answer and in the concept chip row

### 4. "Got it" / "Explore Further" Checkpoint
- After each explanation, user clicks **"Got it"** (marks understood, goes back) or **"Explore Further"** (stays to explore more)
- Understood terms show a ✓ checkmark on their badges
- Progress tracked across the full session

### 5. Explain Simpler
- One-click button to get a plain-English re-explanation of any concept
- Calls `/api/simplify` with the current explanation and exploration path
- Toggle back to original with "Show Original"

### 6. Concept Graph View
- Visual SVG tree showing **all explored concepts** and their relationships
- Nodes colored by status: green (understood), violet (explored), gray (unexplored)
- Accessible via the **"Graph"** button in the header

### 7. Voice Input
- Click the mic button to speak your question
- Automatically transcribes and **submits** — no need to press Explore
- Uses Web Speech API (Chrome)

### 8. File Upload / Image Analysis
- Attach PDFs, text files, or images as context
- File shown as an attachment badge — type your question then press Explore
- PDF text extracted via PyPDF2; images analyzed via Groq vision model

### 9. Session Persistence
- Every session auto-saved per query
- Opening the app always starts fresh (clean home screen)
- Clicking a recent search **instantly restores** the full saved chat

### 10. User Login & Cloud Sync
- Register/login with email and password
- Sessions saved to PostgreSQL — accessible from **any device**
- Share links tied to your account (clean `?share=<id>` URL)
- History shown as "Your history" on the home screen when logged in

### 11. Share Links
- **Logged in:** generates a clean `?share=<id>` link backed by the database
- **Logged out:** encodes full session as base64 URL hash
- Anyone opening the link sees the exact same chat restored

### 12. Progress Tracker
- Comprehension % bar: explored terms / total terms
- Color-coded: green (≥80%), yellow (≥40%), violet (starting)

### 13. Export Session
- Copy to clipboard or download as a `.md` file
- Includes question, answer, key concepts with difficulty, full exploration path

### 14. Related Questions
- 3 follow-up questions suggested after every answer
- Click any to instantly start a new exploration

### 15. Dark / Light Mode
- Toggle in the header — persists across sessions
- Full CSS variable theming across all components

### 16. Home / Reset Button
- House icon in header — clears current session and returns to landing screen

---

## Concept Extraction — The Differentiator

**Bad approach:**
```
Split answer into words → highlight nouns → done
```

**Our approach — Two-prompt LLM pipeline:**

**Prompt 1:** Generate the answer
```
Answer the question clearly and concisely.
Question: {user_query}
```

**Prompt 2:** Extract conceptual terms with difficulty
```
From the following explanation, identify 4-6 terms that:
- Are domain-specific or technical
- A beginner might not understand
- Are important for grasping the core idea

Return as JSON: [{"term": "...", "reason": "...", "difficulty": "beginner|intermediate|advanced"}]
```

This gives **semantically meaningful** terms with difficulty context, not random highlights.

---

## Project Structure

```
Chatbot/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QueryInput.jsx        # Search bar, voice input, file attachment
│   │   │   ├── AnswerPanel.jsx       # Answer display, Got it/Explore Further, Simplify
│   │   │   ├── TermBadge.jsx         # Clickable difficulty-colored concept chips
│   │   │   ├── BreadcrumbTrail.jsx   # Navigation path
│   │   │   ├── KnowledgeTree.jsx     # Sidebar exploration tree
│   │   │   ├── ConceptGraph.jsx      # SVG concept graph modal
│   │   │   ├── ProgressTracker.jsx   # Comprehension % bar
│   │   │   ├── RelatedQuestions.jsx  # Follow-up question suggestions
│   │   │   ├── ExportButton.jsx      # Copy/download session as markdown
│   │   │   ├── ShareButton.jsx       # Share session link
│   │   │   └── AuthModal.jsx         # Login / Register modal
│   │   ├── store/
│   │   │   ├── explorationStore.js   # Zustand session state + persistence
│   │   │   └── authStore.js          # JWT auth state
│   │   ├── api.js                    # Axios instance
│   │   └── App.jsx                   # Root layout + routing
│   ├── .env.production               # VITE_API_URL for Vercel
│   └── vercel.json
├── backend/
│   ├── main.py                       # FastAPI app + startup
│   ├── db.py                         # PostgreSQL connection
│   ├── routes/
│   │   ├── answer.py                 # POST /api/answer
│   │   ├── concepts.py               # POST /api/extract-concepts
│   │   ├── explore.py                # POST /api/explore
│   │   ├── simplify.py               # POST /api/simplify
│   │   ├── related.py                # POST /api/related
│   │   ├── upload.py                 # POST /api/upload (PDF/image)
│   │   ├── auth.py                   # POST /api/auth/register, /login
│   │   └── sessions.py               # CRUD /api/sessions
│   ├── services/
│   │   └── llm_service.py            # Groq API calls (text + vision)
│   ├── models/
│   │   └── schemas.py                # Pydantic models
│   └── requirements.txt
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/answer` | Generate answer + extract concepts |
| POST | `/api/explore` | Sub-explanation for a clicked term |
| POST | `/api/simplify` | Simpler re-explanation of a concept |
| POST | `/api/related` | 3 follow-up question suggestions |
| POST | `/api/upload` | Analyze PDF or image file |
| POST | `/api/auth/register` | Create new user account |
| POST | `/api/auth/login` | Login, receive JWT token |
| GET  | `/api/auth/me` | Get current user info |
| POST | `/api/sessions/save` | Save/upsert a session |
| GET  | `/api/sessions/list` | List user's sessions |
| GET  | `/api/sessions/{id}` | Get a session by ID (for share links) |
| PATCH | `/api/sessions/{id}/bookmark` | Toggle bookmark |
| DELETE | `/api/sessions/{id}` | Delete a session |

---

## Environment Variables

### Backend (.env)
```
GROQ_API_KEY=your_groq_key
DATABASE_URL=postgresql://user:pass@host/dbname
JWT_SECRET=your_secret_key
JWT_EXPIRE_HOURS=720
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.onrender.com
```

---

## Good vs Bad Implementation

| Bad Implementation                        | Our Implementation                             |
|-------------------------------------------|------------------------------------------------|
| Random words highlighted                  | Semantically extracted conceptual terms        |
| No difficulty context                     | B/I/A difficulty badges on every term          |
| Clicking gives repeated/vague explanation | Focused, scoped explanation per term           |
| No recursive depth                        | Multi-level, full exploration stack            |
| No progress tracking                      | Comprehension % + understood term tracking     |
| Sessions lost on refresh                  | Full session restore from recent searches      |
| No user accounts                          | Login + cloud sync across devices              |

---

## Intellectual Property

> The core concept and framework of the Recursive Understanding Engine belongs to **BuilderThinking**.
> This implementation is built as a hackathon exercise. The codebase may be used for learning and showcasing.

---

*Built for BuilderThinking Hackathon — Final Round*
