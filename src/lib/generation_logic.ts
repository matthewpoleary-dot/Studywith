import Groq from "groq-sdk";

// ── Shared types ────────────────────────────────────────────────────────────

export interface Flashcard {
  question: string;
  answer: string;
  topic: string;
  confidence: number; // always 0 on creation
}

export interface QuizQuestion {
  question: string;
  options: string[];      // exactly 4
  correctIndex: number;   // 0-indexed
  explanation: string;
}

// ── Model ───────────────────────────────────────────────────────────────────

const MODEL = "llama-3.1-70b-versatile";

// ── Flashcard Service ────────────────────────────────────────────────────────

const FLASHCARD_SYSTEM = `\
You are an expert exam tutor extracting syllabus-aligned flashcards from student notes.

Focus ONLY on testable content:
- Bolded terms and their definitions
- Numbered processes, sequences, or steps
- Formulas, equations, and their named components
- Date–event relationships (e.g. "1916 — Easter Rising")
- Named laws, theories, models, or experiments

IGNORE: motivational filler, repeated context, broad section headings without substance.

Return a JSON object with a single key "flashcards" containing an array.
Each item must conform to:
  { "question": string, "answer": string, "topic": string, "confidence": 0 }

Rules:
- question: specific, exam-style phrasing — "Define X", "What is the role of Y in Z?",
  "State two functions of…", "What formula relates A to B?"
- answer: concise and direct — maximum 3 sentences; do not pad
- topic: the sub-topic or section this belongs to (e.g. "Cellular Respiration", "WW1 Causes")
- confidence: always 0
- Generate between 8 and 20 cards depending on content density
- No duplicate questions

Return ONLY valid JSON. No markdown fences. No commentary outside the JSON.`;

// ── Quiz Service ─────────────────────────────────────────────────────────────

const QUIZ_SYSTEM = `\
You are an expert exam tutor generating exam-style multiple-choice questions from student notes.

Focus on content that:
- Tests understanding, not just surface recall
- Could plausibly appear in a Leaving Cert or Junior Cert exam
- Covers key definitions, processes, cause-effect relationships, and applications

Return a JSON object with a single key "questions" containing an array.
Each item must conform to:
  { "question": string, "options": [string, string, string, string], "correctIndex": number, "explanation": string }

Rules:
- question: clear, unambiguous, exam-quality phrasing — no trick questions
- options: exactly 4 strings; distractors must be plausible — not obviously wrong
- correctIndex: 0–3 (zero-indexed position of the correct option in "options")
- explanation: 1–2 sentences explaining why the correct answer is right and what makes
  the primary distractor wrong
- Generate between 6 and 12 questions depending on content density
- No duplicate questions

Return ONLY valid JSON. No markdown fences. No commentary outside the JSON.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\n?|```$/gm, "").trim();
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateFlashcards(extractedText: string): Promise<Flashcard[]> {
  const client = new Groq();

  const message = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: FLASHCARD_SYSTEM,
      },
      {
        role: "user",
        content: `Generate flashcards from these student notes:\n\n${extractedText.slice(0, 12000)}`,
      },
    ],
  });

  const raw = stripFences(message.choices[0].message.content ?? "");
  const parsed = JSON.parse(raw) as { flashcards?: unknown };

  if (!Array.isArray(parsed.flashcards)) {
    throw new Error("Model returned unexpected shape for flashcards");
  }

  return (parsed.flashcards as Flashcard[]).map((f) => ({
    question: String(f.question ?? ""),
    answer: String(f.answer ?? ""),
    topic: String(f.topic ?? "General"),
    confidence: 0,
  }));
}

export async function generateQuiz(extractedText: string): Promise<QuizQuestion[]> {
  const client = new Groq();

  const message = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: QUIZ_SYSTEM,
      },
      {
        role: "user",
        content: `Generate practice quiz questions from these student notes:\n\n${extractedText.slice(0, 12000)}`,
      },
    ],
  });

  const raw = stripFences(message.choices[0].message.content ?? "");
  const parsed = JSON.parse(raw) as { questions?: unknown };

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Model returned unexpected shape for quiz questions");
  }

  return (parsed.questions as QuizQuestion[]).map((q) => ({
    question: String(q.question ?? ""),
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
    explanation: String(q.explanation ?? ""),
  }));
}
