import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getBrand } from "@/lib/brand/registry";

export const runtime = "edge";

const EMOJI: Record<string, string> = {
  "dumply":     "🥟",
  "sunny-side": "🍳",
  "smash":      "🍔",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brand: string; size: string }> }
) {
  const { brand, size } = await params;
  const b = getBrand(brand);
  if (!b) return new Response("Not found", { status: 404 });

  const px = Math.min(Math.max(parseInt(size, 10) || 192, 48), 512);
  const emoji = EMOJI[brand] ?? "🍽";
  const fontSize = Math.round(px * 0.46);
  const innerSize = Math.round(px * 0.72);
  const outerRadius = Math.round(px * 0.22);
  const innerRadius = Math.round(px * 0.16);

  return new ImageResponse(
    (
      <div
        style={{
          width: px, height: px,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: b.bg,
          borderRadius: outerRadius,
        }}
      >
        <div
          style={{
            width: innerSize, height: innerSize,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: b.accent,
            borderRadius: innerRadius,
          }}
        >
          <span style={{ fontSize, lineHeight: 1 }}>{emoji}</span>
        </div>
      </div>
    ),
    {
      width: px, height: px,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    }
  );
}
