import TutorChat from "@/components/TutorChat";

type Props = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function NewSessionPage({ searchParams }: Props) {
  const { topic } = await searchParams;
  const initialAssignment = topic ? decodeURIComponent(topic) : "";
  return <TutorChat initialAssignment={initialAssignment} />;
}
