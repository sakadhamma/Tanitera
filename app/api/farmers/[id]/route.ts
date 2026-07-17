import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { KECAMATAN_COORDS, normalizePhone } from "../route";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const wa = normalizePhone(String(body.wa_number ?? ""));
  const kecamatan = String(body.kecamatan ?? "").trim();
  if (!name || !wa || !KECAMATAN_COORDS[kecamatan])
    return NextResponse.json({ error: "name, wa_number, dan kecamatan (dari daftar) wajib diisi" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: existing } = await db.from("farmers").select("kecamatan").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Petani tidak ditemukan" }, { status: 404 });

  const patch: Record<string, any> = {
    name, wa_number: wa, kecamatan,
    gapoktan: body.gapoktan?.trim() || null,
  };
  
  //hanya ubah jika kecamatannya berubah
  if (kecamatan !== existing.kecamatan) {
    const [lng, lat] = KECAMATAN_COORDS[kecamatan];
    const jitter = () => (Math.random() - 0.5) * 0.04;
    patch.location = `POINT(${lng + jitter()} ${lat + jitter()})`;
  }

  const { error } = await db.from("farmers").update(patch).eq("id", id);
  if (error) {
    const msg = error.message.includes("duplicate")
      ? "Nomor WA sudah dipakai petani lain" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  //keep sync
  await db.from("farmer_commodities").delete().eq("farmer_id", id);
  const wanted = String(body.commodities ?? "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
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
      .upsert({ farmer_id: id, commodity_id: comm.id }, { onConflict: "farmer_id,commodity_id" });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("farmers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}