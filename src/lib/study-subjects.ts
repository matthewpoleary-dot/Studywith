export const studySubjects = [
  "Maths",
  "English",
  "Irish",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
  "Business",
  "Economics",
  "Other",
] as const;

export type StudySubject = (typeof studySubjects)[number];

export const subjectOptions = ["Auto-detect", ...studySubjects] as const;

export function studySubject(value: unknown): StudySubject | null {
  if (typeof value !== "string") return null;
  return studySubjects.find((subject) => subject.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

export function explicitlyRecognisedSubject(messages: Array<{ role: string; content: string }>) {
  const tutorText = messages
    .filter((message) => message.role === "tutor")
    .map((message) => message.content)
    .join("\n");

  for (const subject of studySubjects) {
    if (subject === "Other") continue;
    const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const clearRecognition = new RegExp(
      `(?:looks|appears|seems)(?:\\s+like|\\s+to\\s+be)?\\s+(?:an?\\s+)?${escaped}\\s+(?:worksheet|question|problem|exercise|topic|paper)`,
      "i",
    );
    if (clearRecognition.test(tutorText)) return subject;
  }

  return null;
}
