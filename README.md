# StudyLoop — AI-Powered Active Recall & Feynman Teach-Back Learning Platform

**StudyLoop** eliminates passive reading fatigue by transforming dense PDFs, textbook photos, lecture slides, or raw concepts into an interactive **4-Stage Active Learning Loop**:
1. **Ingest & Deconstruct**: Gemini multimodal AI breaks material into progressive mental models with everyday analogies and core takeaways.
2. **Apply (Practice Question)**: Diagnostic conceptual or problem-solving questions generated directly from the content.
3. **Attempt & Diagnose**: Instant AI evaluation showing what you got right, what you missed, and a complete worked solution.
4. **Teach-Back (Friendly Teacher Bot)**: Warm conversational partner where you teach the concept back; evaluates clarity, accuracy, and completeness, and awards a final **Mastery Score (0–100)**.

---

## 🏗️ Architecture & Tech Stack

- **Frontend (`client/`)**: React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, KaTeX + React Markdown (LaTeX math rendering), `@supabase/supabase-js`.
- **Backend (`server/`)**: Node.js + Express, `@google/genai` (official Google Gen AI SDK), `multer` (in-memory multimodal file handling), `helmet`, `cors`, `express-rate-limit`, `zod` validation.
- **Database & Auth (`supabase/`)**: Supabase PostgreSQL with strict Row Level Security (RLS) policies, triggers, and automated user profile sync.

---

## 🚀 Live Local Servers

Both servers are currently running and ready to test:

| Component | URL | Port |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | `5173` |
| **Backend API** | [http://localhost:5001/api](http://localhost:5001/api) | `5001` |
| **API Health Check** | [http://localhost:5001/api/health](http://localhost:5001/api/health) | `5001` |

---

## 🔑 Quick Login with Pre-Seeded Demo Account

You can log in immediately with the pre-seeded account:
- **Email**: `demo.student@studyloop.dev`
- **Password**: `StudyLoop2026!`

*(Or click the **"Click here to fill Demo Account credentials"** button directly on the `/login` page, or create a brand new account on `/signup`).*

---

## 🛠️ Running the Project

From the project root directory:

```bash
# 1. Run database migration & verification
npm run verify
npm run seed

# 2. Start the Backend API (runs on port 5001)
npm run dev:server

# 3. Start the Frontend React Client (runs on port 5173)
npm run dev:client
```
