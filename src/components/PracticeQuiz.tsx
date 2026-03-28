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
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
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

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 85 ? "Excellent work" : pct >= 65 ? "Good effort" : "Keep revising";

    return (
      <div>
        {/* Score */}
        <div className="rounded-2xl bg-[#1A1A1A] p-8 text-center mb-6 no-print">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-4">Quiz Complete</p>
          <div className="font-serif text-7xl font-medium text-white leading-none mb-3">
            {score}/{questions.length}
          </div>
          <p className={`text-sm font-medium ${pct >= 65 ? "text-emerald-400" : "text-red-400"}`}>
            {pct}% — {grade}
          </p>
          <p className="text-xs text-white/30 mt-3">{fileName}</p>
        </div>

        {/* Per-question review */}
        <div className="space-y-3 mb-6">
          {questions.map((question, i) => {
            const userAns = answers[i];
            const correct = userAns === question.correct_index;
            return (
              <div
                key={question.id}
                className={`rounded-xl border p-4 ${correct ? "border-amber-200 bg-amber-50/60" : "border-red-100 bg-red-50/60"}`}
              >
                <div className="flex items-start gap-2.5">
                  {correct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] leading-snug mb-1">Q{i + 1}. {question.question}</p>
                    {!correct && userAns !== null && (
                      <p className="text-xs text-red-500 mb-1">Your answer: {question.options[userAns]}</p>
                    )}
                    <p className="text-xs text-emerald-700 font-medium mb-1.5">✓ {question.options[question.correct_index]}</p>
                    <p className="text-xs text-[#57534E] leading-relaxed">{question.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 no-print">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-black transition"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            Retake Quiz
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E7E5E4] text-sm text-[#57534E] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
            Print Results
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((current / questions.length) * 100);

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#1A1A1A]">Question {current + 1} of {questions.length}</p>
          <p className="text-xs text-[#A8A29E]">{progressPct}% complete</p>
        </div>
        <div className="h-1 w-full rounded-full bg-[#E7E5E4] overflow-hidden mb-2">
          <div className="h-full rounded-full bg-[#1A1A1A] transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex gap-1">
          {questions.map((question, i) => {
            const ans = answers[i];
            let bg = "bg-[#E7E5E4]";
            if (i === current) bg = "bg-[#1A1A1A]";
            else if (ans !== null) bg = ans === question.correct_index ? "bg-amber-300" : "bg-red-400";
            return <div key={question.id} className={`flex-1 h-1 rounded-full transition-colors ${bg}`} />;
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-6 mb-4">
        <p className="font-serif text-lg text-[#1A1A1A] leading-snug mb-6">{q.question}</p>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            let cls = "border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#1A1A1A]/25 hover:bg-[#FAFAF8]";
            if (submitted) {
              if (i === q.correct_index) cls = "border-amber-300 bg-amber-50 text-[#1A1A1A]";
              else if (i === selected) cls = "border-red-200 bg-red-50 text-red-600";
              else cls = "border-[#E7E5E4] bg-white text-[#A8A29E]";
            } else if (selected === i) {
              cls = "border-[#1A1A1A] bg-[#1A1A1A]/5 text-[#1A1A1A]";
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-auto mt-0.5" strokeWidth={2} />
                )}
                {submitted && i === selected && i !== q.correct_index && (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-auto mt-0.5" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>

        {submitted && (
          <div className={`mt-4 rounded-xl p-3.5 text-xs leading-relaxed ${
            isCorrect ? "border border-amber-200 bg-amber-50 text-[#1A1A1A]" : "border border-red-100 bg-red-50 text-[#57534E]"
          }`}>
            <span className="font-semibold">{isCorrect ? "Correct. " : "Incorrect. "}</span>
            {q.explanation}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#A8A29E]">{fileName}</p>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="px-6 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-black transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-black transition"
          >
            {current < questions.length - 1 ? "Next Question →" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}
