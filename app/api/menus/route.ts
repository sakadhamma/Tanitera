import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("menus")
    .select("id, name, menu_ingredients(id, name, unit, qty_per_portion, distributor_price, tag, sort_order)")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const menus = (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    ingredients: (m.menu_ingredients ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => ({
        name: i.name,
        unit: i.unit,
        qtyPerPortion: Number(i.qty_per_portion),
        distributorPrice: Number(i.distributor_price),
        tag: i.tag,
      })),
  }));
  return NextResponse.json({ menus });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, ingredients } = validateMenuBody(body);
  if (!name) return NextResponse.json({ error: name === "" ? "Nama menu wajib diisi" : "Payload tidak valid" }, { status: 400 });
  if (!ingredients) return NextResponse.json({ error: "Setiap bahan wajib: nama, qty per porsi, harga distributor" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: menu, error } = await db.from("menus").insert({ name }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: iErr } = await db.from("menu_ingredients").insert(ingredientRows(menu.id, ingredients));
  if (iErr) {
    await db.from("menus").delete().eq("id", menu.id); // don't leave an empty menu behind
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, menuId: menu.id });
}

export function validateMenuBody(body: any) {
  const name = String(body?.name ?? "").trim();
  const ingredients: any[] = Array.isArray(body?.ingredients) ? body.ingredients : [];
  const valid =
    ingredients.length > 0 &&
    ingredients.every((i) => String(i?.name ?? "").trim() && Number(i?.qtyPerPortion) > 0 && Number(i?.distributorPrice) > 0);
  return { name, ingredients: valid ? ingredients : null };
}

export function ingredientRows(menuId: string, ingredients: any[]) {
  return ingredients.map((i, idx) => ({
    menu_id: menuId,
    name: String(i.name).trim(),
    unit: i.unit || "kg",
    qty_per_portion: Number(i.qtyPerPortion),
    distributor_price: Number(i.distributorPrice),
    tag: i.tag?.trim() || null,
    sort_order: idx,
  }));
}