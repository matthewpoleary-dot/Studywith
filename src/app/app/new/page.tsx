import TutorChat from "@/components/TutorChat";

type Props = {
  searchParams: Promise<{ topic?: string; prefill?: string }>;
};

export default async function NewSessionPage({ searchParams }: Props) {
  const { topic, prefill } = await searchParams;
  // `prefill` is used by Room assignments to pre-load the assignment text
  const initialAssignment = prefill
    ? decodeURIComponent(prefill)
    : topic
      ? decodeURIComponent(topic)
      : "";
  return <TutorChat initialAssignment={initialAssignment} />;
}
