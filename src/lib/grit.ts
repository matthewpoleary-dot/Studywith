type TutorMessage = { role: "student" | "tutor" | "system"; content: string };

const AHA_PATTERNS = [
  /\bi (see|get it|understand) now\b/i,
  /\boh[,!]?\s*(i\s+)?(see|get it|understand)\b/i,
  /\bah[,!]?\s*(i\s+)?(see|get it)\b/i,
  /\bmakes sense (now|to me)\b/i,
  /\bnow i (see|get it|understand)\b/i,
  /\bi('ve| have) got it\b/i,
  /\bthat('s| is) (it|why|how)\b/i,
  /\bi worked it out\b/i,
  /\bi figured it out\b/i,
  /\bso that('s| is) why\b/i,
  /\bclick(s|ed)?\b.*\bnow\b/i,
];

export function calculateGrit(messages: TutorMessage[]): number {
  const studentMessages = messages.filter((m) => m.role === "student");
  const exchanges = studentMessages.length;

  // 10 base points for finishing
  let grit = 10;

  // +5 for every 3 student exchanges (productive struggle bonus)
  grit += Math.floor(exchanges / 3) * 5;

  // +20 if any student message contains an aha moment
  const hasAha = studentMessages.some((m) =>
    AHA_PATTERNS.some((pattern) => pattern.test(m.content)),
  );
  if (hasAha) grit += 20;

  return grit;
}
