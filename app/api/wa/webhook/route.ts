import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseFarmerReply, ParsedItem } from "@/lib/parser";
                                      
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sender = normalizePhone(String(body.sender ?? ""));
  const message = String(body.message ?? "").trim();
  if (!sender || !message) return NextResponse.json({ ok: true });

  const db = supabaseAdmin();

  const { data: farmer } = await db
    .from("farmers").select("id, name").eq("wa_number", sender).maybeSingle();
  if (!farmer) return NextResponse.json({ ok: true });

  const { data: log } = await db
    .from("wa_outbound_log")
    .select("demand_id")
    .eq("farmer_id", farmer.id)
    .order("sent_at", { ascending: false })
    .limit(1).maybeSingle();
  if (!log?.demand_id) return NextResponse.json({ ok: true });

  const { data: dItems } = await db
    .from("demand_items")
    .select("id, commodities(name, aliases, unit)")
    .eq("demand_id", log.demand_id);
  const demandItems = (dItems ?? []).map((di: any) => ({
    id: di.id,
    name: String(di.commodities?.name ?? "").toLowerCase(),
    aliases: (di.commodities?.aliases ?? []).map((a: string) => a.toLowerCase()),
  }));

  const parsed = await parseFarmerReply(message);

  await db.from("wa_inbound_log").insert({
    farmer_id: farmer.id,
    demand_id: log.demand_id,
    raw_message: message,
    intent: parsed.intent,
    confidence: parsed.confidence,
    parsed_items: parsed.items,
  });

  if (parsed.intent === "offer" && parsed.items.length) {
    const recorded: string[] = [];
    let unmatched = 0;

    for (const it of parsed.items) {
      const target = matchItem(it, demandItems);
      if (!target || !it.qty || !it.price_per_unit) { unmatched++; continue; }
      await db.from("applications").upsert(
        {
          demand_item_id: target.id,
          farmer_id: farmer.id,
          offered_qty_kg: it.qty,
          price_per_kg: it.price_per_unit,
          raw_message: message,
          parse_confidence: parsed.confidence,
        },
        { onConflict: "demand_item_id,farmer_id" }
      );
      recorded.push(`${target.name} ${it.qty} @ Rp ${it.price_per_unit.toLocaleString("id-ID")}`);
    }

    const shortName = farmer.name.split(" ").slice(0, 2).join(" ");
    if (recorded.length) {
      let ack = `Penawaran dicatat, ${shortName}:\n- ${recorded.join("\n- ")}\nHasil seleksi dikabari hari ini.`;
      if (unmatched > 0)
        ack += `\n(${unmatched} item tidak dikenali — sebutkan nama bahannya ya.)`;
      await sendWA(sender, ack);
    } else {
      await sendWA(sender,
        `Maaf ${shortName}, bahannya belum dikenali. Sebutkan nama bahan + jumlah + harga.\n` +
        `Contoh: ${demandItems[0]?.name ?? "wortel"} 80 9rb`);
    }
  } else if (parsed.intent === "unclear") {
    await sendWA(sender,
      `Maaf, pesannya belum jelas. Balas: [nama bahan] [jumlah] [harga]. Contoh: ${demandItems[0]?.name ?? "wortel"} 80 9rb`);
  }

  return NextResponse.json({ ok: true });
}

function matchItem(
  it: ParsedItem,
  demandItems: { id: string; name: string; aliases: string[] }[]
) {
  if (!it.commodity) return demandItems.length === 1 ? demandItems[0] : null;
  const c = it.commodity.toLowerCase().trim();
  const hit = demandItems.find(
    (d) =>
      d.name.includes(c) || c.includes(d.name) ||
      d.aliases.some((a) => a.includes(c) || c.includes(a))
  );
  return hit ?? (demandItems.length === 1 ? demandItems[0] : null);
}

async function sendWA(target: string, message: string) {
  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target, message }),
    });
  } catch { /* non-fatal */ }
}

function normalizePhone(p: string): string {
  const digits = p.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+" + digits;
}