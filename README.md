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
LLM Answer Generation
    ↓
Concept Extraction Engine  ← (THE CRITICAL PIECE)
    ↓
Highlighted Clickable Terms in Answer
    ↓
User clicks a Term
    ↓
Focused Sub-Explanation (new LLM call, scoped to that term)
    ↓
New Terms Extracted from Sub-Explanation
    ↓
Recursive Loop continues...
    ↓
User marks "I Understand" → Exploration ends
```

---

## Tech Stack

| Layer              | Technology                  | Why                                              |
|--------------------|-----------------------------|--------------------------------------------------|
| **Frontend**       | React.js + TailwindCSS      | Component-based, clean UI, fast rendering        |
| **Backend**        | FastAPI (Python)            | Lightweight, async, easy LLM integration         |
| **LLM**            | Claude API (Anthropic)      | Best at structured reasoning and concept extraction |
| **State Management** | Zustand                   | Track exploration depth, breadcrumb history      |
| **Concept Extraction** | LLM-based structured prompt | Semantic understanding, not keyword matching |
| **Deployment**     | Render (backend) + Vercel (frontend) | Free tier, fast deploy for hackathon     |

---

## Key Features

### 1. Smart Concept Identification Engine
- Uses a **dedicated LLM prompt** to extract only meaningful, potentially confusing, domain-relevant terms
- Filters out common words (`is`, `the`, `that`)
- Returns terms with difficulty/importance context
- Highlights them visually inside the answer text

### 2. Recursive Exploration Tree
- Every term click spawns a **new scoped explanation**
- Each explanation generates its own new clickable terms
- Users can go **N levels deep**
- A **breadcrumb trail** shows the path: `LIME → Model-Agnostic → Internal Structure`

### 3. Exploration History / Knowledge Map
- Visual sidebar showing the **exploration tree**
- Users can jump back to any previously explored node
- Shows which terms have been explored vs unexplored

### 4. "I Understand" Checkpoint
- After each explanation, user can click **"Got it"** or **"Explore further"**
- Tracks comprehension progress per session

### 5. Jargon Simplification
- Sub-explanations are generated with a "explain like I'm new to this field" constraint
- Avoids circular explanations (term A explaining itself using term A)

---

## Concept Extraction — The Differentiator

This is what separates a good implementation from a bad one.

**Bad approach:**
```
Split answer into words → highlight nouns → done
```

**Our approach — Two-prompt LLM pipeline:**

**Prompt 1:** Generate the answer to the user's question
```
Answer the question clearly and concisely.
Question: {user_query}
```

**Prompt 2:** Extract conceptual terms from that answer
```
From the following explanation, identify 4-6 terms that:
- Are domain-specific or technical
- A beginner might not understand
- Are important for grasping the core idea
- Are NOT common English words

Return as JSON: [{"term": "...", "reason": "..."}]

Explanation: {generated_answer}
```

This gives **semantically meaningful** terms, not random highlights.

---

## Recursive Design Logic

```json
Session State:
{
  "root_query": "What is LIME in AI?",
  "exploration_stack": [
    {
      "level": 0,
      "term": "LIME",
      "answer": "LIME is an explainable AI technique...",
      "terms": ["Explainable AI", "Model-agnostic", "Predictions", "Locally"]
    },
    {
      "level": 1,
      "term": "Model-agnostic",
      "answer": "Model-agnostic means the method works independently...",
      "terms": ["Machine learning model", "Internal structure"]
    },
    {
      "level": 2,
      "term": "Internal structure",
      "answer": "Internal structure refers to...",
      "terms": ["Weights", "Layers", "Neural network"]
    }
  ]
}
```

- Stack grows on click, shrinks on back navigation
- Each node is independently explorable
- Max depth: 5 levels (configurable)

---

## Evaluation Criteria Mapping

| Criteria                          | How We Address It                                                   |
|-----------------------------------|---------------------------------------------------------------------|
| **Depth of idea implementation**  | Full recursive stack with session state, not just 1-level deep      |
| **Quality of extracted terms**    | LLM-based semantic extraction with importance scoring               |
| **Multi-level exploration**       | Unlimited depth with breadcrumb + tree visualization                |
| **Smoothness and usability**      | Clean React UI, animated transitions, no page reloads               |
| **Simplicity of explanations**    | Scoped prompts that avoid jargon in sub-explanations                |

---

## Project Structure

```
rue/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QueryInput.jsx           # Main search bar
│   │   │   ├── AnswerPanel.jsx          # Displays answer with highlighted terms
│   │   │   ├── TermBadge.jsx            # Clickable term chips
│   │   │   ├── ExplorationDrawer.jsx    # Recursive sub-explanation panel
│   │   │   ├── BreadcrumbTrail.jsx      # Navigation path
│   │   │   └── KnowledgeTree.jsx        # Visual exploration tree (sidebar)
│   │   ├── store/
│   │   │   └── explorationStore.js      # Zustand session state
│   │   └── App.jsx
├── backend/
│   ├── main.py                          # FastAPI entry point
│   ├── routes/
│   │   ├── answer.py                    # POST /api/answer
│   │   └── concepts.py                  # POST /api/extract-concepts
│   ├── services/
│   │   ├── llm_service.py               # Claude API calls
│   │   └── concept_extractor.py         # Two-prompt extraction pipeline
│   └── models/
│       └── schemas.py                   # Pydantic request/response models
└── README.md
```

---

## Build Steps

| Step | Task                                          |
|------|-----------------------------------------------|
| 1    | Backend setup — FastAPI + Claude API          |
| 2    | Concept extraction engine (two-prompt pipeline) |
| 3    | Frontend skeleton — React + TailwindCSS       |
| 4    | Answer panel with highlighted clickable terms |
| 5    | Recursive exploration drawer (click → sub-explain → new terms) |
| 6    | Breadcrumb trail + exploration tree sidebar   |
| 7    | Session state management (Zustand)            |
| 8    | Polish — animations, loading states, mobile layout |

---

## Good vs Bad Implementation

| Bad Implementation                        | Our Implementation                             |
|-------------------------------------------|------------------------------------------------|
| Random words highlighted                  | Semantically extracted conceptual terms        |
| Common words: "is", "that", "provides"    | Domain-specific: "Model-agnostic", "LIME"      |
| Clicking gives repeated/vague explanation | Focused, scoped explanation per term           |
| No recursive depth                        | Multi-level, full exploration stack            |
| Just a chatbot + random highlighting      | A system that guides thinking step-by-step     |

---

## Intellectual Property

> The core concept and framework of the Recursive Understanding Engine belongs to **BuilderThinking**.
> This implementation is built as a hackathon exercise. The codebase may be used for learning and showcasing.

---

*Built for BuilderThinking Hackathon — Final Round*