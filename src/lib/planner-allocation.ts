export type PlannerSubject = { name: string; confidence: number; priority: number };

function subjectWeight(subject: PlannerSubject) {
  return Math.max(1, 6 - subject.confidence + subject.priority - 1);
}

export function allocatePlannerSubjects(subjects: PlannerSubject[], count: number) {
  if (!subjects.length || count < 1) return [];

  const ranked = [...subjects].sort((a, b) => subjectWeight(b) - subjectWeight(a));
  const allocations = new Map(ranked.map((subject) => [subject.name, 0]));
  const result: PlannerSubject[] = [];

  for (const subject of ranked.slice(0, count)) {
    result.push(subject);
    allocations.set(subject.name, 1);
  }

  while (result.length < count) {
    const next = ranked.reduce((best, subject) => {
      const subjectRatio = (allocations.get(subject.name) ?? 0) / subjectWeight(subject);
      const bestRatio = (allocations.get(best.name) ?? 0) / subjectWeight(best);
      return subjectRatio < bestRatio ? subject : best;
    });
    result.push(next);
    allocations.set(next.name, (allocations.get(next.name) ?? 0) + 1);
  }

  return result;
}
