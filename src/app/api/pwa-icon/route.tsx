import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(512, Math.max(16, parseInt(searchParams.get("size") ?? "192")));
  const radius = Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#1A1A1A",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          fontSize: Math.round(size * 0.54),
          fontWeight: 700,
          color: "#D97706",
        }}
      >
        S
      </div>
    ),
    { width: size, height: size },
  );
}
