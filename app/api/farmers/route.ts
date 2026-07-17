import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const KECAMATAN_COORDS: Record<string, [number, number]> = {
  "Garut Kota":     [107.9087, -7.2278],
  "Cilawu":         [107.9400, -7.2800],
  "Bayongbong":     [107.8400, -7.3000],
  "Samarang":       [107.8300, -7.2000],
  "Tarogong Kaler": [107.8700, -7.1800],
  "Karangpawitan":  [107.9500, -7.2100],
  "Cikajang":       [107.8000, -7.3700],
  "Cisurupan":      [107.7800, -7.3100],
  "Banyuresmi":     [107.9300, -7.1500],
  "Leles":          [107.9000, -7.1100],
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const wa = normalizePhone(String(body.wa_number ?? ""));
  const kecamatan = String(body.kecamatan ?? "").trim();
  if (!name || !wa || !KECAMATAN_COORDS[kecamatan])
    return NextResponse.json({ error: "name, wa_number, dan kecamatan (dari daftar) wajib diisi" }, { status: 400 });

  const db = supabaseAdmin();
  const [lng, lat] = KECAMATAN_COORDS[kecamatan];
  const jitter = () => (Math.random() - 0.5) * 0.04;

  const { data: farmer, error } = await db
    .from("farmers")
    .insert({
      name,
      wa_number: wa,
      kecamatan,
      gapoktan: body.gapoktan?.trim() || null,
      location: `POINT(${lng + jitter()} ${lat + jitter()})`,
      verified_by: "Input manual SPPG",
    })
    .select("id, name")
    .single();
  if (error) {
    const msg = error.message.includes("duplicate")
      ? "Nomor WA sudah terdaftar" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const wanted = String(body.commodities ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const cName of wanted) {
    let { data: comm } = await db
      .from("commodities").select("id").ilike("name", cName).maybeSingle();
    if (!comm) {
      const ins = await db.from("commodities")
        .insert({ name: cName, unit: "kg" }).select("id").single();
      if (ins.error) continue;
      comm = ins.data;
    }
    await db.from("farmer_commodities")
      .upsert({ farmer_id: farmer.id, commodity_id: comm.id }, { onConflict: "farmer_id,commodity_id" });
  }

  return NextResponse.json({ ok: true, farmerId: farmer.id });
}

function normalizePhone(p: string): string {
  const digits = p.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+" + digits;
}