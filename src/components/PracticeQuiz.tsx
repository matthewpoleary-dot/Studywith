"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Printer } from "lucide-react";

export interface QuizQuestionRow {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Props {
  questions: QuizQuestionRow[];
  fileName: string;
}

export default function PracticeQuiz({ questions, fileName }: Props) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null),
  );
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isCorrect = submitted && selected === q.correct_index;
  const score = answers.filter((a, i) => a === questions[i]?.correct_index).length;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = selected;
      return next;
    });
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setDone(true);
    }
  };

  const handleReset = () => {
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setAnswers(Array(questions.length).fill(null));
    setDone(false);
  };

  // ── Results screen ─────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade =
      pct >= 85 ? "Excellent work" : pct >= 65 ? "Good effort" : "Keep revising";

    return (
      <div className="max-w-2xl mx-auto">
        {/* Score card */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-8 text-center mb-6 no-print">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1A2B3C] mb-5">
            Quiz Complete
          </p>
          <div className="font-serif text-7xl font-medium text-[#1A2B3C] leading-none mb-3">
            {score}/{questions.length}
          </div>
          <p
            className={`text-sm font-medium ${
              pct >= 65 ? "text-emerald-600" : "text-[#B91C1C]"
            }`}
          >
            {pct}% — {grade}
          </p>
          <p className="text-xs text-[#94A3B8] mt-3">{fileName}</p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3 mb-6">
          {questions.map((question, i) => {
            const userAns = answers[i];
            const correct = userAns === question.correct_index;
            return (
              <div
                key={question.id}
                className={`rounded-xl border p-4 ${
                  correct
                    ? "border-[#FEF08A] bg-[#FEF08A]/20"
                    : "border-[#B91C1C]/25 bg-red-50/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {correct ? (
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                  ) : (
                    <XCircle
                      className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] leading-snug mb-1">
                      Q{i + 1}. {question.question}
                    </p>
                    {!correct && userAns !== null && (
                      <p className="text-xs text-[#B91C1C] mb-1">
                        Your answer: {question.options[userAns]}
                      </p>
                    )}
                    <p className="text-xs text-emerald-700 font-medium mb-1.5">
                      ✓ {question.options[question.correct_index]}
                    </p>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 no-print">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A2B3C] text-white text-sm font-medium hover:bg-[#1A2B3C]/90 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            Retake Quiz
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#57534E] hover:border-[#1A2B3C]/30 hover:text-[#1A2B3C] transition"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
            Print Results
          </button>
        </div>
      </div>
    );
  }

  // ── Active quiz ────────────────────────────────────────────────────────────
  const progressPct = Math.round((current / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#1A2B3C]">
            Question {current + 1} of {questions.length}
          </p>
          <p className="text-xs text-[#64748B]">{progressPct}% complete</p>
        </div>
        {/* Overall bar */}
        <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[#1A2B3C] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Per-question colour trail */}
        <div className="flex gap-1">
          {questions.map((question, i) => {
            const ans = answers[i];
            let bg = "bg-[#E2E8F0]";
            if (i === current) bg = "bg-[#1A2B3C]";
            else if (ans !== null)
              bg = ans === question.correct_index ? "bg-[#FEF08A]" : "bg-[#B91C1C]/60";
            return (
              <div
                key={question.id}
                className={`flex-1 h-1 rounded-full transition-colors ${bg}`}
              />
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-6 mb-4">
        <p className="font-serif text-lg text-[#1A2B3C] leading-snug mb-6">
          {q.question}
        </p>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            // Derive visual state for this option
            let cls =
              "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#1A2B3C]/30 hover:bg-[#F8FAFC]";
            if (submitted) {
              if (i === q.correct_index) {
                cls = "border-[#FEF08A] bg-[#FEF08A]/30 text-[#1A1A1A]";
              } else if (i === selected) {
                cls = "border-[#B91C1C]/40 bg-red-50 text-[#B91C1C]";
              } else {
                cls = "border-[#E2E8F0] bg-white text-[#94A3B8]";
              }
            } else if (selected === i) {
              cls = "border-[#1A2B3C] bg-[#1A2B3C]/5 text-[#1A2B3C]";
            }

            return (
              <button
                key={i}
                disabled={submitted}
                onClick={() => setSelected(i)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition flex items-start gap-3 ${cls}`}
              >
                <span className="shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-semibold mt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="leading-snug flex-1">{opt}</span>
                {submitted && i === q.correct_index && (
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0 ml-auto mt-0.5"
                    strokeWidth={2}
                  />
                )}
                {submitted && i === selected && i !== q.correct_index && (
                  <XCircle
                    className="w-4 h-4 text-[#B91C1C] shrink-0 ml-auto mt-0.5"
                    strokeWidth={2}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {submitted && (
          <div
            className={`mt-4 rounded-xl p-3.5 text-xs leading-relaxed ${
              isCorrect
                ? "border border-[#FEF08A] bg-[#FEF08A]/25 text-[#1A1A1A]"
                : "border border-[#B91C1C]/20 bg-red-50 text-[#334155]"
            }`}
          >
            <span className="font-semibold">
              {isCorrect ? "Correct. " : "Incorrect. "}
            </span>
            {q.explanation}
          </div>
        )}
      </div>

      {/* Footer: source + action */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#94A3B8]">Source: {fileName}</p>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="px-6 py-2.5 rounded-xl bg-[#1A2B3C] text-white text-sm font-medium hover:bg-[#1A2B3C]/90 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#1A2B3C] text-white text-sm font-medium hover:bg-[#1A2B3C]/90 transition"
          >
            {current < questions.length - 1 ? "Next Question →" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}
