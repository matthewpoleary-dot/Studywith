"use client";

type Props = { roomName: string; roomCode: string };

export default function JoinClient({ roomName, roomCode }: Props) {
  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        <a
          href="/"
          className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-80 transition-opacity mb-10 inline-block"
        >
          StudyWith
        </a>

        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-8 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-1">You have been invited to</p>
          <h1 className="font-serif text-2xl font-medium text-[#1A1A1A] mb-1">{roomName}</h1>
          <p className="text-sm text-[#A8A29E] font-mono tracking-widest">Code: {roomCode}</p>
        </div>

        <p className="text-sm text-[#57534E] mb-6">
          Sign in or create a free account to join this room.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={`/auth/login?redirectTo=/join/${roomCode}`}
            className="inline-flex items-center justify-center bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/90 rounded-lg px-6 py-3 text-sm font-medium transition-all"
          >
            Sign in
          </a>
          <a
            href={`/auth/signup?redirectTo=/join/${roomCode}`}
            className="inline-flex items-center justify-center border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white rounded-lg px-6 py-3 text-sm font-medium transition-all duration-200"
          >
            Get started free
          </a>
        </div>
      </div>
    </div>
  );
}
