"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export type Workflow = { title: string; use: string; prompt: string; steps: string[] };

export function ToolkitLibrary({ workflows }: { workflows: Workflow[] }) {
  const [copied, setCopied] = useState("");
  async function copy(workflow: Workflow) {
    await navigator.clipboard.writeText(workflow.prompt);
    setCopied(workflow.title);
    setTimeout(() => setCopied(""), 1800);
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {workflows.map((workflow, index) => (
        <article key={workflow.title} className="card flex flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-sm font-black text-white">
              0{index + 1}
            </span>
            <button
              onClick={() => void copy(workflow)}
              className="focus-ring flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-extrabold hover:border-ink"
            >
              {copied === workflow.title ? <Check size={14} /> : <Copy size={14} />}
              {copied === workflow.title ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <h2 className="mt-6 text-xl font-extrabold tracking-[-.025em]">{workflow.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{workflow.use}</p>
          <div className="my-5 rounded-2xl bg-[#edf0f1] p-4 text-sm leading-6">{workflow.prompt}</div>
          <ol className="mt-auto grid gap-2 border-t border-line pt-5">
            {workflow.steps.map((step, stepIndex) => (
              <li key={step} className="flex gap-3 text-xs leading-5 text-muted">
                <strong className="text-brand">{stepIndex + 1}</strong>
                {step}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
