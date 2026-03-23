import TutorChat from "@/components/TutorChat";

type Props = {
  searchParams: Promise<{ topic?: string; prefill?: string; imageUrl?: string; autoStart?: string; fileUrl?: string; fileName?: string; roomId?: string }>;
};

export default async function NewSessionPage({ searchParams }: Props) {
  const { topic, prefill, imageUrl, autoStart, fileUrl, fileName, roomId } = await searchParams;
  // `prefill` is used by Room assignments to pre-load the assignment text
  const initialAssignment = prefill
    ? decodeURIComponent(prefill)
    : topic
      ? decodeURIComponent(topic)
      : "";
  return (
    <TutorChat
      initialAssignment={initialAssignment}
      initialImageUrl={imageUrl ? decodeURIComponent(imageUrl) : undefined}
      autoFetchOpener={autoStart === "1"}
      assignmentFileUrl={fileUrl ? decodeURIComponent(fileUrl) : undefined}
      assignmentFileName={fileName ? decodeURIComponent(fileName) : undefined}
      roomId={roomId ? decodeURIComponent(roomId) : undefined}
    />
  );
}
