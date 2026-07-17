import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const items: any[] = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.some((i) => !i.commodity || !i.qty || i.qty <= 0))
    return NextResponse.json({ error: "items[] dengan commodity & qty wajib diisi" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: sppg } = await db.from("sppg").select("id, name").limit(1).single();
  if (!sppg) return NextResponse.json({ error: "Tidak ada SPPG — jalankan seed schema.sql dulu" }, { status: 500 });

  const { data: demand, error: dErr } = await db
    .from("demands")
    .insert({ sppg_id: sppg.id, week_start: nextMonday(), status: "matching" })
    .select("id").single();
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const created: { commodity: string; unit: string; qty: number; demandItemId: string }[] = [];
  for (const it of items) {
    const name = String(it.commodity).trim();
    const unit = it.unit || "kg";
    let { data: comm } = await db
      .from("commodities").select("id, name").ilike("name", name).maybeSingle();
    if (!comm) {
      const ins = await db.from("commodities")
        .insert({ name: name.toLowerCase(), unit })
        .select("id, name").single();
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
      comm = ins.data;
    }
    const { data: item, error: iErr } = await db
      .from("demand_items")
      .insert({
        demand_id: demand.id, commodity_id: comm.id,
        qty_kg: it.qty, max_price_per_kg: it.maxPrice ?? null,
      })
      .select("id").single();
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    created.push({ commodity: name.toLowerCase(), unit, qty: it.qty, demandItemId: item.id });
  }

  const { data: recipients } = await db.rpc("farmers_to_notify_demand", {
    p_demand_id: demand.id,
    p_radius_km: 30,
  });

  const list = created.map((c) => `- ${c.qty}${c.unit} ${c.commodity}`).join("\n");
  const example = created.length > 1
    ? `${created[0].commodity} 80 9rb, ${created[1].commodity} 50 12rb`
    : `${created[0].commodity} 80 9rb`;
  const text =
    `${sppg.name} butuh untuk minggu depan:\n${list}\n` +
    `Punya stok? Balas dengan jumlah & harga per item.\n` +
    `Contoh: ${example}`;

  const cap = Number(process.env.BLAST_MAX_RECIPIENTS || 10);
  const targets = (recipients ?? []).slice(0, cap);
  let sent = 0;

  for (const r of targets) {
    try {
      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: process.env.FONNTE_TOKEN || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: r.wa_number, message: text }),
      });
      sent++;
    } catch { /* keep going — one bad number shouldn't kill the blast */ }
    await db.from("wa_outbound_log").insert({
      farmer_id: r.farmer_id, demand_id: demand.id, message: text,
    });
    await new Promise((res) => setTimeout(res, 250));
  }

  return NextResponse.json({
    demandId: demand.id,
    items: created.map(({ commodity, demandItemId }) => ({ commodity, demandItemId })),
    notified: sent,
    eligible: recipients?.length ?? 0,
  });
}

function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}