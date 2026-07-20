// OG obrázek per brand — barva + emoji + název, generováno na hraně.
import { ImageResponse } from "next/og";
import { getBrand } from "@/lib/brand/registry";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EMOJI: Record<string, string> = { "sunny-side": "🍳", "dumply": "🥟", "smash": "🍔" };

export default async function Image({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const b = getBrand(brand);
  const bg = b?.accent ?? "#111";
  const fg = b?.accentInk ?? "#fff";
  const name = b?.name ?? "Free City";
  const sub = b?.eyebrow ?? "Praha";

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: bg, color: fg,
        fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: 160 }}>{EMOJI[brand] ?? "🍴"}</div>
        <div style={{ fontSize: 88, fontWeight: 800, marginTop: 8 }}>{name}</div>
        <div style={{ fontSize: 32, marginTop: 12, opacity: 0.85 }}>{sub}</div>
        <div style={{ fontSize: 24, marginTop: 40, opacity: 0.6 }}>free city · objednej online</div>
      </div>
    ),
    { ...size }
  );
}
