import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { validateMenuBody, ingredientRows } from "../route";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, ingredients } = validateMenuBody(body);
  if (!name) return NextResponse.json({ error: "Nama menu wajib diisi" }, { status: 400 });
  if (!ingredients) return NextResponse.json({ error: "Setiap bahan wajib: nama, qty per porsi, harga distributor" }, { status: 400 });

  const db = supabaseAdmin();
  const { error: mErr } = await db
    .from("menus")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const { error: dErr } = await db.from("menu_ingredients").delete().eq("menu_id", id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const { error: iErr } = await db.from("menu_ingredients").insert(ingredientRows(id, ingredients));
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("menus").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}