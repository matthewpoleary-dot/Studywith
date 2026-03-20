"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, LogIn, Users, ChevronRight, Loader2, Copy, Check } from "lucide-react";
import { posthog } from "@/lib/posthog";

type Room = { id: string; code: string; name: string; created_at: string };

const INVITE_BASE = "https://studywith-phi.vercel.app/join";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    posthog.capture('room_invite_copied', { type: label });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 border border-[#E7E5E4] text-[#57534E] hover:border-[#1A1A1A] hover:text-[#1A1A1A] rounded-xl px-4 py-2 text-sm font-medium transition-all"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function RoomsClient() {
  const [teachingRooms, setTeachingRooms] = useState<Room[]>([]);
  const [studentRooms, setStudentRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Create room
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newlyCreatedRoom, setNewlyCreatedRoom] = useState<Room | null>(null);

  // Join room
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms/list");
      const data = (await res.json()) as { teachingRooms: Room[]; studentRooms: Room[] };
      setTeachingRooms(data.teachingRooms ?? []);
      setStudentRooms(data.studentRooms ?? []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRooms(); }, []);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName }),
      });
      const data = (await res.json()) as { room?: Room; error?: string };
      if (data.error) { setCreateError(data.error); return; }
      if (data.room) {
        setTeachingRooms((prev) => [data.room!, ...prev]);
        setNewlyCreatedRoom(data.room);
        setRoomName("");
        posthog.capture('room_created');
      }
    } catch {
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = (await res.json()) as { room?: Room; error?: string };
      if (data.error) { setJoinError(data.error); return; }
      if (data.room) {
        posthog.capture('room_joined', { method: 'code' });
        window.location.href = `/app/rooms/${data.room.code}`;
      }
    } catch {
      setJoinError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const RoomCard = ({ room, role }: { room: Room; role: "teacher" | "student" }) => (
    <Link
      href={`/app/rooms/${room.code}`}
      className="flex items-center justify-between gap-4 bg-white border border-[#E7E5E4] rounded-2xl px-5 py-4 hover:border-[#D97706]/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-[#D97706]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">{room.name}</p>
          <p className="text-xs text-[#A8A29E] mt-0.5">
            Code: <span className="font-mono font-semibold tracking-wider">{room.code}</span>
            {" "}&middot;{" "}
            <span className="capitalize">{role === "teacher" ? "Your room" : "Joined"}</span>
          </p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#A8A29E] group-hover:text-[#D97706] transition shrink-0" strokeWidth={1.5} />
    </Link>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-14">

        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-[#1A1A1A]">Rooms</h1>
          <p className="text-sm text-[#57534E] mt-2">
            Create a room, assign work, and track how your students think through it. Students join with a 6-digit code.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Create room */}
          <div className="flex-1">
            {newlyCreatedRoom ? (
              // Success state — show code prominently
              <div className="bg-white border border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                  <p className="text-sm font-medium text-[#1A1A1A]">Room created: <span className="text-[#57534E]">{newlyCreatedRoom.name}</span></p>
                </div>
                <div className="text-center bg-[#F5F4F0] rounded-xl py-4 px-6">
                  <p className="text-xs text-[#A8A29E] mb-1 uppercase tracking-widest font-semibold">Room code</p>
                  <p className="font-mono text-4xl font-bold tracking-[0.25em] text-[#1A1A1A]">{newlyCreatedRoom.code}</p>
                </div>
                <p className="text-xs text-[#57534E] text-center">Share this code with your students to let them join.</p>
                <div className="flex gap-2 flex-wrap">
                  <CopyButton text={newlyCreatedRoom.code} label="Copy code" />
                  <CopyButton text={`${INVITE_BASE}/${newlyCreatedRoom.code}`} label="Copy invite link" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/app/rooms/${newlyCreatedRoom.code}`}
                    className="flex-1 inline-flex items-center justify-center bg-[#1A1A1A] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#1A1A1A]/80 transition"
                  >
                    Go to room
                  </Link>
                  <button
                    onClick={() => { setNewlyCreatedRoom(null); setCreateOpen(false); }}
                    className="px-4 py-2 rounded-xl border border-[#E7E5E4] text-sm text-[#57534E] hover:bg-[#F5F4F0] transition"
                  >
                    Create another
                  </button>
                </div>
              </div>
            ) : !createOpen ? (
              <button
                onClick={() => setCreateOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-5 py-3 text-sm font-medium hover:bg-[#1A1A1A]/80 transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Create a room
              </button>
            ) : (
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">New room</p>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
                  placeholder="e.g. Leaving Cert Maths Group, Year 12 Biology"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
                  autoFocus
                />
                {createError && <p className="text-xs text-red-500">{createError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleCreate()}
                    disabled={!roomName.trim() || creating}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#1A1A1A]/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create room"}
                  </button>
                  <button
                    onClick={() => { setCreateOpen(false); setRoomName(""); setCreateError(null); }}
                    className="px-4 py-2 rounded-xl border border-[#E7E5E4] text-sm text-[#57534E] hover:bg-[#F5F4F0] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Join room */}
          <div className="flex-1">
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">Join a room</p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full rounded-xl border border-[#E7E5E4] bg-[#FDFCF8] px-3 py-2.5 text-sm font-mono tracking-widest text-[#1A1A1A] outline-none placeholder:text-[#A8A29E] placeholder:font-sans placeholder:tracking-normal focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/30 transition"
              />
              {joinError && <p className="text-xs text-red-500">{joinError}</p>}
              <button
                onClick={() => void handleJoin()}
                disabled={joinCode.length < 4 || joining}
                className="w-full inline-flex items-center justify-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4" strokeWidth={1.5} />Join room</>}
              </button>
            </div>
          </div>
        </div>

        {/* Room lists */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-[#A8A29E] animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {teachingRooms.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">Your rooms</p>
                <div className="space-y-2">
                  {teachingRooms.map((room) => (
                    <RoomCard key={room.id} room={room} role="teacher" />
                  ))}
                </div>
              </section>
            )}

            {studentRooms.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] mb-3">Joined rooms</p>
                <div className="space-y-2">
                  {studentRooms.map((room) => (
                    <RoomCard key={room.id} room={room} role="student" />
                  ))}
                </div>
              </section>
            )}

            {teachingRooms.length === 0 && studentRooms.length === 0 && (
              <div className="text-center py-14">
                <p className="text-3xl mb-3">🐋</p>
                <p className="text-sm font-medium text-[#1A1A1A]">No rooms yet</p>
                <p className="text-xs text-[#A8A29E] mt-1">Create a room to assign work, or join one with a code.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
