"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sprout, MapPin, Send, Sparkles, CheckCircle2, ArrowLeft, MessageCircle,
  Radio, RotateCcw, Users, Wheat, Plus, Trash2, Pencil, Truck, XCircle,
  HelpCircle, Zap, FlaskConical, AlertTriangle, UtensilsCrossed, UserPlus,
} from "lucide-react";
import {
  FARMER_PROFILES, DEFAULT_INGREDIENTS, UNITS, LOGISTICS,
  getRepliesFor, staggerDelay, shuffle, slugify, fmtRp, strToSeed,
} from "@/lib/sim";
import { MENU_PRESETS, PAX_PRESETS } from "@/lib/menus";
import { supabaseBrowser } from "@/lib/supabase";

const MAXKM = 30, R = 160, CX = 200, CY = 200;
const STORE_KEY = "tsppg_state_v3";
const angleFor = (f) => f.angle ?? Math.abs(strToSeed(String(f.id))) % 360;
const pos = (f) => {
  const r = Math.min((f.distanceKm ?? MAXKM) / MAXKM, 1) * R;
  const rad = (angleFor(f) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};
const stableId = (name) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || slugify(name);
const round2 = (n) => Math.round(n * 100) / 100;
const blankMenuIng = () => ({ name: "", unit: "kg", qtyPerPortion: "", distributorPrice: "", tag: "" });

export default function Dashboard() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [hydrated, setHydrated] = useState(false);
  const [gateOk, setGateOk] = useState(false);
  const [ingredients, setIngredients] = useState(DEFAULT_INGREDIENTS);
  const [activeIng, setActiveIng] = useState(DEFAULT_INGREDIENTS[0].id);
  const [mode, setMode] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_MODE === "sim" ? "sim" : "live"
  );
  const [status, setStatus] = useState({});
  const [replies, setReplies] = useState({});
  const [liveRanked, setLiveRanked] = useState({});
  const [confirmedKeys, setConfirmedKeys] = useState({});
  const [resetHint, setResetHint] = useState({});
  const [errMsg, setErrMsg] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [menuSel, setMenuSel] = useState(MENU_PRESETS[0].id);
  const [form, setForm] = useState({ name: "", unit: "kg", qtyPerPortion: "", distributorPrice: "", tag: "" });

  // calculate per porsi
  const [pax, setPax] = useState(PAX_PRESETS[PAX_PRESETS.length - 1]);
  const [paxCustom, setPaxCustom] = useState(false);

  // menus backend from supabase, backup from menus.js
  const [liveMenus, setLiveMenus] = useState([]);
  const [menusErr, setMenusErr] = useState(null);
  const menus = liveMenus.length ? liveMenus : MENU_PRESETS;

  // insert/update/delete menus in Supabase
  const [showMenuManage, setShowMenuManage] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState(null); // null = creating new
  const [menuForm, setMenuForm] = useState({ name: "", ingredients: [blankMenuIng()] });
  const [menuFormErr, setMenuFormErr] = useState(null);
  const [menuFormBusy, setMenuFormBusy] = useState(false);

  const timersRef = useRef({});
  const channelsRef = useRef({});
  const liveItemsRef = useRef({});
  const liveDemandsRef = useRef({});

  const ingredient = ingredients.find((i) => i.id === activeIng) || ingredients[0];

  // pin gate
  useEffect(() => {
    const pin = process.env.NEXT_PUBLIC_DEMO_PIN || "";
    if (pin && typeof window !== "undefined" && localStorage.getItem("tsppg_unlocked") !== "1") {
      router.replace("/login");
      return;
    }
    setGateOk(true);
  }, [router]);

  const clearTimersFor = useCallback((id) => {
    (timersRef.current[id] || []).forEach(clearTimeout);
    timersRef.current[id] = [];
  }, []);
  const closeChannelFor = useCallback((id) => {
    if (channelsRef.current[id] && supabase) supabase.removeChannel(channelsRef.current[id]);
    delete channelsRef.current[id];
  }, [supabase]);
  useEffect(() => () => {
    Object.keys(timersRef.current).forEach(clearTimersFor);
    Object.keys(channelsRef.current).forEach(closeChannelFor);
  }, [clearTimersFor, closeChannelFor]);

  const resetIngredient = useCallback((id, keepHint = false) => {
    clearTimersFor(id);
    closeChannelFor(id);
    delete liveItemsRef.current[id];
    delete liveDemandsRef.current[id];
    setStatus((s) => ({ ...s, [id]: "idle" }));
    setReplies((s) => ({ ...s, [id]: [] }));
    setLiveRanked((s) => ({ ...s, [id]: [] }));
    setConfirmedKeys((s) => ({ ...s, [id]: [] }));
    setErrMsg((s) => ({ ...s, [id]: null }));
    if (!keepHint) setResetHint((s) => ({ ...s, [id]: false }));
  }, [clearTimersFor, closeChannelFor]);

  // live refetch
  const refetchLive = useCallback(async (id, itemId, demandId) => {
    if (!supabase) return;
    const [{ data: ranked }, { data: inbound }] = await Promise.all([
      supabase.from("ranked_applications").select("*").eq("demand_item_id", itemId),
      supabase.from("wa_inbound_log")
        .select("id, raw_message, intent, parsed_items, received_at, farmers(name, kecamatan)")
        .eq("demand_id", demandId)
        .order("received_at", { ascending: false }),
    ]);
    const rows = (ranked || [])
      .map((r) => ({
        key: r.application_id, appId: r.application_id,
        farmer: {
          id: r.farmer_id, name: r.farmer_name, desa: r.kecamatan || r.gapoktan || "—",
          distanceKm: Math.round(r.distance_km * 10) / 10,
          reliability: Math.round(r.reliability_score * 100),
        },
        qty: r.offered_qty_kg, harga: r.price_per_kg, text: r.raw_message,
        score: r.match_score, dbStatus: r.status, overBudget: r.over_budget,
      }))
      .sort((a, b) => b.score - a.score);
    setLiveRanked((s) => ({ ...s, [id]: rows }));
    setConfirmedKeys((s) => ({
      ...s,
      [id]: rows.filter((r) => r.dbStatus === "accepted").map((r) => r.key),
    }));
    setReplies((s) => ({
      ...s,
      [id]: (inbound || []).map((m) => ({
        kind: m.intent === "offer" ? "offer" : m.intent === "decline" ? "decline" : "unclear",
        farmer: { id: "in" + m.id, name: m.farmers?.name || "Petani", desa: m.farmers?.kecamatan || "" },
        items: Array.isArray(m.parsed_items) ? m.parsed_items : [],
        qty: null, harga: null, text: m.raw_message, key: "in" + m.id,
      })),
    }));
  }, [supabase]);

  const subscribeLive = useCallback((id, itemId, demandId) => {
    if (!supabase) return;
    closeChannelFor(id);
    const ch = supabase
      .channel("live-" + id + "-" + itemId.slice(0, 8))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `demand_item_id=eq.${itemId}` },
        () => refetchLive(id, itemId, demandId))
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "wa_inbound_log", filter: `demand_id=eq.${demandId}` },
        () => refetchLive(id, itemId, demandId))
      .subscribe();
    channelsRef.current[id] = ch;
  }, [supabase, closeChannelFor, refetchLive]);

  // one blast for one / many ingredients with the same endpoints
  const broadcastLive = useCallback(async (ings) => {
    if (!supabase) {
      ings.forEach((ing) => {
        setErrMsg((s) => ({ ...s, [ing.id]: "Supabase belum dikonfigurasi (.env.local) — pakai mode Simulasi dulu." }));
        setStatus((s) => ({ ...s, [ing.id]: "error" }));
      });
      return;
    }
    ings.forEach((ing) => { resetIngredient(ing.id); setStatus((s) => ({ ...s, [ing.id]: "sending" })); });
    try {
      const res = await fetch("/api/wa/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pax,
          items: ings.map((i) => ({
            commodity: i.name, qty: i.demand, unit: i.unit, maxPrice: i.distributorPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Blast gagal");
      for (const ing of ings) {
        const match = (data.items || []).find((it) => it.commodity === ing.name.trim().toLowerCase());
        if (!match) continue;
        liveItemsRef.current[ing.id] = match.demandItemId;
        liveDemandsRef.current[ing.id] = data.demandId;
        setStatus((s) => ({ ...s, [ing.id]: "receiving" }));
        subscribeLive(ing.id, match.demandItemId, data.demandId);
        refetchLive(ing.id, match.demandItemId, data.demandId);
      }
    } catch (e) {
      ings.forEach((ing) => {
        setErrMsg((s) => ({ ...s, [ing.id]: String(e.message || e) }));
        setStatus((s) => ({ ...s, [ing.id]: "error" }));
      });
    }
  }, [supabase, resetIngredient, subscribeLive, refetchLive, pax]);

  // simulation
  const broadcastSim = useCallback((ing) => {
    const id = ing.id;
    resetIngredient(id);
    setStatus((s) => ({ ...s, [id]: "sending" }));
    const t0 = setTimeout(() => {
      setStatus((s) => ({ ...s, [id]: "receiving" }));
      const order = shuffle(getRepliesFor(ing));
      if (order.length === 0) { setStatus((s) => ({ ...s, [id]: "done" })); return; }
      order.forEach((o, i) => {
        const t = setTimeout(() => {
          setReplies((s) => ({ ...s, [id]: [{ ...o, key: o.farmer.id, ts: Date.now() }, ...(s[id] || [])] }));
          if (i === order.length - 1) {
            const tEnd = setTimeout(() => setStatus((s) => ({ ...s, [id]: "done" })), 400);
            timersRef.current[id].push(tEnd);
          }
        }, staggerDelay(i));
        timersRef.current[id].push(t);
      });
    }, 800);
    timersRef.current[id] = [t0];
  }, [resetIngredient]);

  const broadcastOne = (ing) => mode === "live" ? broadcastLive([ing]) : broadcastSim(ing);
  const broadcastAll = () => mode === "live"
    ? broadcastLive(ingredients)
    : ingredients.forEach(broadcastSim);

  // save state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.ingredients) && s.ingredients.length) setIngredients(s.ingredients);
        if (s.activeIng) setActiveIng(s.activeIng);
        if (s.mode) setMode(s.mode);
        if (s.replies) setReplies(s.replies);
        if (s.confirmedKeys) setConfirmedKeys(s.confirmedKeys);
        liveItemsRef.current = s.liveItems || {};
        liveDemandsRef.current = s.liveDemands || {};
        const st = {};
        for (const [id, v] of Object.entries(s.status || {})) {
          st[id] = s.mode === "sim" && (v === "sending" || v === "receiving") ? "idle" : v;
        }
        setStatus(st);
      }
    } catch { /* corrupt state → start fresh */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !supabase) return;
    for (const [id, itemId] of Object.entries(liveItemsRef.current)) {
      const demandId = liveDemandsRef.current[id];
      if (!itemId || !demandId) continue;
      subscribeLive(id, itemId, demandId);
      refetchLive(id, itemId, demandId);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        ingredients, activeIng, mode, replies, confirmedKeys, status,
        liveItems: liveItemsRef.current, liveDemands: liveDemandsRef.current,
      }));
    } catch { /* storage full/blocked → non-fatal */ }
  }, [hydrated, ingredients, activeIng, mode, replies, confirmedKeys, status]);

  const loadMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/menus");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat menu");
      setLiveMenus(Array.isArray(data.menus) ? data.menus : []);
      setMenusErr(null);
    } catch (e) {
      setLiveMenus([]);
      setMenusErr(String(e.message || e));
    }
  }, []);
  useEffect(() => { loadMenus(); }, [loadMenus]);

  useEffect(() => {
    if (!menus.some((m) => m.id === menuSel)) setMenuSel(menus[0]?.id);
  }, [menus, menuSel]);

  // input n update ingredients
  const updateIngredient = (id, patch) => {
    const invalidates = ("distributorPrice" in patch || "unit" in patch);
    const hadReplies = (replies[id] || []).length > 0;
    setIngredients((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (invalidates && hadReplies) {
      resetIngredient(id, true);
      setResetHint((s) => ({ ...s, [id]: true }));
    }
  };
  const removeIngredient = (id) => {
    if (ingredients.length <= 1) return;
    resetIngredient(id);
    const next = ingredients.filter((i) => i.id !== id);
    setIngredients(next);
    if (activeIng === id) setActiveIng(next[0].id);
  };
  const addIngredient = () => {
    const qtyPerPortion = Number(form.qtyPerPortion);
    const price = Number(form.distributorPrice);
    if (!form.name.trim() || !qtyPerPortion || qtyPerPortion <= 0 || !price || price <= 0) return;
    const id = stableId(form.name);
    if (ingredients.some((i) => i.id === id)) { setActiveIng(id); setShowAdd(false); return; }
    setIngredients((list) => [...list, {
      id, name: form.name.trim(), unit: form.unit, qtyPerPortion, demand: round2(qtyPerPortion * pax),
      distributorPrice: price, distributorDays: 3, tag: form.tag.trim() || "Custom",
    }]);
    setActiveIng(id);
    setForm({ name: "", unit: "kg", qtyPerPortion: "", distributorPrice: "", tag: "" });
    setShowAdd(false);
  };
  const loadMenu = () => {
    const preset = menus.find((m) => m.id === menuSel);
    if (!preset) return;
    Object.keys(timersRef.current).forEach(clearTimersFor);
    Object.keys(channelsRef.current).forEach(closeChannelFor);
    liveItemsRef.current = {}; liveDemandsRef.current = {};
    const items = preset.ingredients.map((ing) => ({
      ...ing, id: stableId(ing.name), distributorDays: 3,
      demand: round2(ing.qtyPerPortion * pax),
    }));
    setIngredients(items);
    setActiveIng(items[0].id);
    setStatus({}); setReplies({}); setLiveRanked({}); setConfirmedKeys({}); setErrMsg({}); setResetHint({});
  };

  useEffect(() => {
    setIngredients((list) => list.map((i) =>
      i.qtyPerPortion ? { ...i, demand: round2(i.qtyPerPortion * pax) } : i
    ));
  }, [pax]);

  // new scoring methods
  const simScored = useMemo(() => {
    const offers = (replies[ingredient?.id] || []).filter((r) => r.kind === "offer");
    const budget = ingredient?.distributorPrice ?? Infinity;
    const eligible = offers.filter((o) => o.harga <= budget);
    const overCount = offers.length - eligible.length;
    if (!eligible.length) return { ranked: [], overCount };
    const minP = Math.min(...eligible.map((a) => a.harga));
    const ranked = eligible.map((a) => ({
      ...a,
      score:
        0.40 * (1 - Math.min(a.farmer.distanceKm, MAXKM) / MAXKM) +
        0.35 * (minP / a.harga) +
        0.25 * (a.farmer.reliability / 100),
    })).sort((a, b) => b.score - a.score);
    return { ranked, overCount };
  }, [replies, ingredient?.id, ingredient?.distributorPrice]);

  const liveRows = liveRanked[ingredient?.id] || [];
  const ranked = mode === "live" ? liveRows.filter((r) => !r.overBudget) : simScored.ranked;
  const overCount = mode === "live" ? liveRows.filter((r) => r.overBudget).length : simScored.overCount;
  const tickerItems = replies[ingredient?.id] || [];
  const confirmedList = confirmedKeys[ingredient?.id] || [];
  const confirmedRows = ranked.filter((r) => confirmedList.includes(r.key));
  const totalQty = confirmedRows.reduce((s, r) => s + r.qty, 0);
  const demandSafe = Math.max(1, ingredient?.demand || 1);
  const progressPct = Math.min(100, (totalQty / demandSafe) * 100);
  const localCost = confirmedRows.reduce((s, r) => s + r.qty * r.harga, 0);
  const avgLocal = totalQty ? localCost / totalQty : 0;
  const savingsPct = totalQty && ingredient
    ? ((ingredient.distributorPrice - avgLocal) / ingredient.distributorPrice) * 100 : 0;
  const demandMet = totalQty >= demandSafe;

  const toggleConfirm = async (row) => {
    const id = ingredient.id;
    const already = confirmedList.includes(row.key);
    if (mode === "live") {
      if (already) return;
      const res = await fetch("/api/applications/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: row.appId }),
      });
      if (res.ok) setConfirmedKeys((s) => ({ ...s, [id]: [...(s[id] || []), row.key] }));
      return;
    }
    setConfirmedKeys((s) => ({
      ...s,
      [id]: already ? (s[id] || []).filter((k) => k !== row.key) : [...(s[id] || []), row.key],
    }));
  };

  const aggregate = useMemo(() => {
    let retained = 0, savingsSum = 0, countDone = 0;
    ingredients.forEach((ing) => {
      const rows = mode === "live"
        ? (liveRanked[ing.id] || []).filter((r) => !r.overBudget)
        : (replies[ing.id] || []).filter((r) => r.kind === "offer");
      const confirmed = rows.filter((r) => (confirmedKeys[ing.id] || []).includes(r.key));
      const qty = confirmed.reduce((s, r) => s + r.qty, 0);
      if (!qty) return;
      const cost = confirmed.reduce((s, r) => s + r.qty * r.harga, 0);
      retained += cost;
      savingsSum += ((ing.distributorPrice - cost / qty) / ing.distributorPrice) * 100;
      countDone += 1;
    });
    return { retained, avgSavings: countDone ? savingsSum / countDone : 0, countDone };
  }, [ingredients, replies, liveRanked, confirmedKeys, mode]);

  if (!gateOk || !hydrated || !ingredient) return null;
  const st = status[ingredient.id] || "idle";
  const anyBusy = ingredients.some((i) => ["sending", "receiving"].includes(status[i.id]));
  const offerCount = tickerItems.filter((t) => t.kind === "offer").length;
  const repliedFarmerIds = new Set(tickerItems.filter((t) => t.kind === "offer").map((t) => t.farmer.id));
  const confirmedFarmerIds = new Set(confirmedRows.map((r) => r.farmer.id));

  return (
    <div style={{ padding: 22 }}>
      <style>{`
        .dash-topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
        .topbar-left { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .back-btn { display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:8px 14px; font-size:12.5px; font-weight:700; color:var(--sawah-deep); cursor:pointer; font-family:inherit; }
        .mode-toggle { display:flex; border:1.5px solid var(--line); border-radius:999px; overflow:hidden; background:var(--card); }
        .mode-btn { border:none; background:transparent; padding:8px 14px; font-size:12px; font-weight:700; color:var(--ink-soft); cursor:pointer; display:flex; align-items:center; gap:5px; font-family:inherit; }
        .mode-btn.on { background:var(--sawah); color:#F4EFD9; }
        .tsppg-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; border-bottom:2px solid var(--sawah); padding-bottom:18px; margin-bottom:20px; }
        .brand { display:flex; gap:12px; align-items:center; }
        .brand-icon { width:46px; height:46px; border-radius:10px; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .brand h1 { font-size:24px; font-weight:700; margin:0; letter-spacing:-0.01em; color:var(--sawah-deep); }
        .brand p { margin:2px 0 0; font-size:12.5px; color:var(--ink-soft); }
        .header-stats { display:flex; gap:10px; flex-wrap:wrap; }
        .mini-stat { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:8px 14px; min-width:118px; }
        .mini-stat .label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft); }
        .mini-stat .value { font-family:var(--font-spacemono),monospace; font-weight:700; font-size:15px; color:var(--sawah-deep); }
        .menu-row { display:flex; gap:10px; align-items:end; flex-wrap:wrap; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:14px; }
        .menu-row .sel { min-width:220px; }
        .menu-row .pax-field { min-width:150px; }
        .menu-note { font-size:11px; color:var(--ink-soft); flex:1; min-width:180px; }
        .menu-manage { background:var(--card); border:1.5px dashed var(--line); border-radius:14px; padding:16px; margin-bottom:18px; }
        .menu-manage-list { display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }
        .menu-manage-list-row { display:flex; align-items:center; gap:10px; border:1px solid var(--line); border-radius:10px; padding:8px 12px; background:var(--bg,transparent); }
        .menu-manage-list-row .name { flex:1; font-size:13px; font-weight:600; color:var(--sawah-deep); }
        .menu-ing-row { display:grid; grid-template-columns:1.3fr .7fr .8fr .9fr .8fr auto; gap:8px; align-items:end; margin-bottom:8px; }
        @media (max-width:640px){ .menu-ing-row { grid-template-columns:1fr 1fr; } }
        .menu-manage-actions { display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-top:10px; flex-wrap:wrap; }
        .ing-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center; }
        .ing-tab { border:1.5px solid var(--line); background:var(--card); border-radius:999px; padding:8px 16px; font-size:13px; font-weight:600; color:var(--ink-soft); cursor:pointer; display:flex; align-items:center; gap:8px; font-family:inherit; }
        .ing-tab.active { background:var(--sawah); color:#F4EFD9; border-color:var(--sawah); }
        .ing-tab .dot { width:8px; height:8px; border-radius:50%; background:#B7AD7D; }
        .ing-tab .dot.done { background:var(--green-ok); }
        .ing-tab .dot.prog { background:var(--gold); animation:pulse 1.1s infinite; }
        .ing-tab-add { border:1.5px dashed var(--sawah); background:transparent; color:var(--sawah); border-radius:999px; padding:8px 14px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        .add-form { background:var(--card); border:1.5px dashed var(--line); border-radius:14px; padding:16px; margin-bottom:18px; display:grid; grid-template-columns:1.4fr .8fr .9fr .9fr .9fr auto; gap:10px; align-items:end; }
        @media (max-width:860px){ .add-form { grid-template-columns:1fr 1fr; } }
        .tsppg-grid { display:grid; grid-template-columns:1.15fr .85fr; gap:20px; }
        @media (max-width:860px){ .tsppg-grid { grid-template-columns:1fr; } }
        .panel { display:flex; flex-direction:column; gap:16px; }
        .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; }
        .card h2 { font-size:15px; font-weight:600; margin:0 0 4px; color:var(--sawah-deep); display:flex; align-items:center; gap:8px; }
        .card .sub { font-size:12px; color:var(--ink-soft); margin:0 0 14px; }
        .demand-headline { display:flex; align-items:baseline; gap:10px; }
        .demand-headline input.num { font-size:44px; font-weight:800; color:var(--sawah-deep); line-height:1; width:130px; }
        .demand-headline .unit { font-size:15px; color:var(--ink-soft); font-weight:600; }
        .demand-compare { display:flex; align-items:center; gap:10px; margin-top:12px; font-size:12px; color:var(--ink-soft); flex-wrap:wrap; }
        .demand-compare input.mono { width:90px; color:var(--clay); font-weight:700; font-family:var(--font-spacemono),monospace; }
        .row-actions { display:flex; gap:10px; align-items:center; margin-top:14px; flex-wrap:wrap; }
        .status-badge { font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; }
        .status-sending { background:#EFE0B8; color:#7A5A0E; }
        .status-receiving { background:#DCEAD9; color:#2F5D37; }
        .status-done { background:#CFE3D0; color:var(--green-ok); }
        .status-error { background:#F3D5C8; color:var(--clay); }
        .hint { font-size:11.5px; color:var(--clay); display:flex; align-items:center; gap:5px; margin-top:8px; }
        .ticker-list { display:flex; flex-direction:column; gap:8px; max-height:250px; overflow-y:auto; padding-right:4px; }
        .ticker-item { border:1px solid var(--line); border-radius:10px; padding:9px 12px; background:#FEFDF6; animation:slideIn .35s ease; }
        .ticker-item.decline { background:#F3F0E2; opacity:.8; }
        .ticker-item.unclear { background:#FBF3DC; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:translateY(0);} }
        .ticker-item .row1 { display:flex; justify-content:space-between; font-size:12.5px; font-weight:700; color:var(--sawah-deep); }
        .ticker-item .raw { font-size:12px; color:var(--ink-soft); font-style:italic; margin:3px 0 6px; }
        .ticker-item .parsed { display:flex; gap:8px; align-items:center; font-size:11px; flex-wrap:wrap; }
        .parsed .pill { background:var(--sawah); color:#EFE9C9; border-radius:6px; padding:2px 8px; font-family:var(--font-spacemono),monospace; font-weight:700; }
        .parsed .tag-ai { color:var(--gold-deep); display:flex; align-items:center; gap:3px; font-weight:700; }
        .parsed .tag-decline { color:var(--ink-soft); display:flex; align-items:center; gap:3px; font-weight:700; }
        .parsed .tag-unclear { color:#9A6E0C; display:flex; align-items:center; gap:3px; font-weight:700; }
        .empty-hint { font-size:12.5px; color:var(--ink-soft); padding:18px 0; text-align:center; border:1.5px dashed var(--line); border-radius:10px; }
        .progress-track { height:8px; border-radius:999px; background:var(--bg-alt); overflow:hidden; margin:6px 0 14px; }
        .progress-fill { height:100%; background:var(--green-ok); transition:width .4s ease; }
        .rank-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--line); }
        .rank-row:first-of-type { border-top:none; }
        .rank-num { font-family:var(--font-spacemono),monospace; font-weight:700; color:var(--ink-soft); width:22px; }
        .rank-main { flex:1; min-width:0; }
        .rank-main .name { font-weight:700; font-size:13.5px; }
        .rank-main .meta { font-size:11.5px; color:var(--ink-soft); display:flex; gap:10px; margin-top:2px; flex-wrap:wrap; }
        .score-bar { width:54px; height:5px; border-radius:999px; background:var(--bg-alt); overflow:hidden; margin-top:4px; }
        .score-bar-fill { height:100%; background:var(--gold); }
        .confirm-btn { border:1.5px solid var(--sawah); background:transparent; color:var(--sawah); border-radius:999px; padding:6px 12px; font-size:11.5px; font-weight:700; cursor:pointer; white-space:nowrap; font-family:inherit; }
        .confirm-btn.on { background:var(--green-ok); border-color:var(--green-ok); color:white; }
        .over-note { font-size:11.5px; color:var(--clay); font-weight:700; margin-top:10px; display:flex; align-items:center; gap:5px; }
        .radar-wrap { display:flex; justify-content:center; }
        .radar-legend { display:flex; gap:14px; font-size:11px; color:var(--ink-soft); justify-content:center; margin-top:8px; flex-wrap:wrap; }
        .legend-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:4px; }
        .logistics { border:1.5px solid var(--green-ok); background:#EDF3E8; }
        .logistics h2 { color:var(--green-ok); }
        .logi-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:12.5px; }
        @media (max-width:640px){ .logi-grid { grid-template-columns:1fr; } }
        .logi-grid .k { font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft); }
        .logi-grid .v { font-weight:700; color:var(--sawah-deep); margin-top:2px; }
        .logi-note { margin-top:12px; font-size:11.5px; color:var(--green-ok); font-weight:700; display:flex; align-items:center; gap:6px; }
        .summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .summary-tile { background:var(--bg-alt); border-radius:10px; padding:12px 14px; }
        .summary-tile .label { font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft); }
        .summary-tile .value { font-family:var(--font-spacemono),monospace; font-weight:700; font-size:16.5px; color:var(--sawah-deep); margin-top:4px; }
        .summary-tile .value.good { color:var(--green-ok); }
      `}</style>

      <div className="dash-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push("/")}><ArrowLeft size={14} /> Landing</button>
          <button className="back-btn" onClick={() => router.push("/farmers")}><UserPlus size={14} /> Kelola petani</button>
        </div>
        <div className="mode-toggle" title="Simulasi = data lokal deterministik. Live = Supabase + WhatsApp + Gemini.">
          <button className={"mode-btn" + (mode === "sim" ? " on" : "")} onClick={() => setMode("sim")}>
            <FlaskConical size={13} /> Simulasi
          </button>
          <button className={"mode-btn" + (mode === "live" ? " on" : "")} onClick={() => setMode("live")}>
            <Zap size={13} /> Live
          </button>
        </div>
      </div>

      <div className="tsppg-header">
        <div className="brand">
          <div className="brand-icon"><Sprout size={22} /></div>
          <div>
            <h1>Dashboard SPPG</h1>
            <p>{mode === "live" ? "Mode LIVE — WhatsApp & database sungguhan" : "Mode simulasi — data deterministik untuk demo"}</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="mini-stat"><div className="label">Bahan terpenuhi</div><div className="value">{aggregate.countDone}/{ingredients.length}</div></div>
          <div className="mini-stat"><div className="label">Rata-rata hemat</div><div className="value">{aggregate.avgSavings ? aggregate.avgSavings.toFixed(0) : 0}%</div></div>
          <div className="mini-stat"><div className="label">Uang tetap di Garut</div><div className="value">{fmtRp(aggregate.retained)}</div></div>
        </div>
      </div>

      <div className="menu-row">
        <div className="sel">
          <span className="field-label"><UtensilsCrossed size={11} style={{ verticalAlign: -1 }} /> Menu MBG minggu ini</span>
          <select className="field-input" value={menuSel || ""} onChange={(e) => setMenuSel(e.target.value)}>
            {menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="sel pax-field">
          <span className="field-label">Jumlah pax (porsi)</span>
          {paxCustom ? (
            <input
              className="field-input" type="number" min="1" autoFocus
              value={pax}
              onChange={(e) => setPax(Math.max(1, Number(e.target.value) || 1))}
              onBlur={() => { if (PAX_PRESETS.includes(pax)) setPaxCustom(false); }}
            />
          ) : (
            <select
              className="field-input"
              value={PAX_PRESETS.includes(pax) ? pax : "custom"}
              onChange={(e) => {
                if (e.target.value === "custom") { setPaxCustom(true); return; }
                setPax(Number(e.target.value));
              }}
            >
              {PAX_PRESETS.map((p) => <option key={p} value={p}>{p} porsi</option>)}
              <option value="custom">Custom…</option>
            </select>
          )}
        </div>
        <button className="btn btn-primary" style={{ height: 38 }} onClick={loadMenu}>Muat bahan menu</button>
        <button
          className="btn-ghost" style={{ height: 38 }}
          onClick={() => {
            setShowMenuManage((v) => !v);
            setEditingMenuId(null);
            setMenuForm({ name: "", ingredients: [blankMenuIng()] });
            setMenuFormErr(null);
          }}
        >
          <UtensilsCrossed size={13} /> Kelola menu
        </button>
        <span className="menu-note">
          Memuat menu mengganti daftar bahan (tetap bisa diedit/ditambah setelahnya). Jumlah bahan = kebutuhan per porsi × pax.
        </span>
        {menusErr && <span className="menu-note" style={{ color: "var(--clay)" }}>Menu dari Supabase gagal dimuat ({menusErr}) — pakai preset offline dulu.</span>}
      </div>

      {showMenuManage && (
        <div className="menu-manage">
          <div className="menu-manage-list">
            {liveMenus.length === 0 && (
              <p className="menu-note">Belum ada menu di Supabase — dropdown menu masih pakai preset offline (lib/menus.js), yang belum bisa diedit/dihapus di sini. Isi form di bawah untuk membuat menu pertama.</p>
            )}
            {liveMenus.map((m) => (
              <div key={m.id} className="menu-manage-list-row">
                <span className="name">{m.name}</span>
                <span className="menu-note">{m.ingredients.length} bahan</span>
                <button
                  className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => {
                    setEditingMenuId(m.id);
                    setMenuForm({
                      name: m.name,
                      ingredients: m.ingredients.map((i) => ({
                        name: i.name, unit: i.unit, qtyPerPortion: i.qtyPerPortion,
                        distributorPrice: i.distributorPrice, tag: i.tag || "",
                      })),
                    });
                    setMenuFormErr(null);
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  className="btn-danger" style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={async () => {
                    if (!confirm(`Hapus menu "${m.name}"?`)) return;
                    await fetch(`/api/menus/${m.id}`, { method: "DELETE" });
                    loadMenus();
                    if (editingMenuId === m.id) { setEditingMenuId(null); setMenuForm({ name: "", ingredients: [blankMenuIng()] }); }
                  }}
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            ))}
          </div>

          <div><span className="field-label">Nama menu</span>
            <input
              className="field-input" placeholder="mis. Sop Ayam Sayuran"
              value={menuForm.name}
              onChange={(e) => setMenuForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {menuForm.ingredients.map((ing, idx) => (
            <div className="menu-ing-row" key={idx}>
              <div><span className="field-label">Bahan</span>
                <input
                  className="field-input" placeholder="mis. Wortel" value={ing.name}
                  onChange={(e) => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, name: e.target.value } : r) }))}
                />
              </div>
              <div><span className="field-label">Satuan</span>
                <select
                  className="field-input" value={ing.unit}
                  onChange={(e) => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r) }))}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><span className="field-label">Qty/porsi</span>
                <input
                  className="field-input" type="number" min="0.001" step="0.001" placeholder="0.06" value={ing.qtyPerPortion}
                  onChange={(e) => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, qtyPerPortion: e.target.value } : r) }))}
                />
              </div>
              <div><span className="field-label">Harga distributor</span>
                <input
                  className="field-input" type="number" min="1" placeholder="12000" value={ing.distributorPrice}
                  onChange={(e) => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, distributorPrice: e.target.value } : r) }))}
                />
              </div>
              <div><span className="field-label">Kategori</span>
                <input
                  className="field-input" placeholder="Sayur" value={ing.tag}
                  onChange={(e) => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.map((r, i) => i === idx ? { ...r, tag: e.target.value } : r) }))}
                />
              </div>
              <button
                className="btn-danger" style={{ height: 38 }}
                disabled={menuForm.ingredients.length <= 1}
                onClick={() => setMenuForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="menu-manage-actions">
            <button
              className="btn-ghost" style={{ height: 38 }}
              onClick={() => setMenuForm((f) => ({ ...f, ingredients: [...f.ingredients, blankMenuIng()] }))}
            >
              <Plus size={14} /> Tambah bahan
            </button>
            {menuFormErr && <span className="menu-note" style={{ color: "var(--clay)" }}>{menuFormErr}</span>}
            <button
              className="btn btn-primary" style={{ height: 38 }} disabled={menuFormBusy}
              onClick={async () => {
                setMenuFormBusy(true); setMenuFormErr(null);
                try {
                  const payload = {
                    name: menuForm.name,
                    ingredients: menuForm.ingredients.map((i) => ({ ...i, qtyPerPortion: Number(i.qtyPerPortion), distributorPrice: Number(i.distributorPrice) })),
                  };
                  const url = editingMenuId ? `/api/menus/${editingMenuId}` : "/api/menus";
                  const method = editingMenuId ? "PUT" : "POST";
                  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Gagal menyimpan menu");
                  await loadMenus();
                  setShowMenuManage(false);
                } catch (e) {
                  setMenuFormErr(String(e.message || e));
                } finally {
                  setMenuFormBusy(false);
                }
              }}
            >
              {editingMenuId ? "Simpan perubahan" : "Buat menu"}
            </button>
          </div>
        </div>
      )}

      <div className="ing-tabs">
        {ingredients.map((ing) => {
          const s = status[ing.id] || "idle";
          return (
            <button key={ing.id} className={"ing-tab" + (ing.id === ingredient.id ? " active" : "")} onClick={() => setActiveIng(ing.id)}>
              <span className={"dot" + (s === "done" ? " done" : s === "sending" || s === "receiving" ? " prog" : "")} />
              {ing.name} · {ing.demand}{ing.unit}
            </button>
          );
        })}
        <button className="ing-tab-add" onClick={() => setShowAdd((v) => !v)}><Plus size={14} /> Tambah bahan</button>
        <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 12.5 }} disabled={anyBusy} onClick={broadcastAll}>
          <Send size={13} /> Kirim SEMUA bahan (1 pesan WA)
        </button>
      </div>

      {showAdd && (
        <div className="add-form">
          <div><span className="field-label">Nama bahan</span><input className="field-input" placeholder="mis. Kentang" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><span className="field-label">Satuan</span>
            <select className="field-input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div><span className="field-label">Jumlah per porsi</span><input className="field-input" type="number" min="0.001" step="0.001" placeholder="0.06" value={form.qtyPerPortion} onChange={(e) => setForm((f) => ({ ...f, qtyPerPortion: e.target.value }))} /></div>
          <div><span className="field-label">Est. harga distributor (Rp)</span><input className="field-input" type="number" min="1" placeholder="10000" value={form.distributorPrice} onChange={(e) => setForm((f) => ({ ...f, distributorPrice: e.target.value }))} /></div>
          <div><span className="field-label">Kategori (opsional)</span><input className="field-input" placeholder="Sayur / Bumbu / Umbi" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} /></div>
          <button className="btn btn-primary" style={{ height: 38 }} onClick={addIngredient}><Plus size={15} /> Tambah</button>
          {!!Number(form.qtyPerPortion) && (
            <span className="menu-note">= {round2(Number(form.qtyPerPortion) * pax)}{form.unit} untuk {pax} porsi</span>
          )}
        </div>
      )}

      <div className="tsppg-grid">
        <div className="panel">
          <div className="card">
            <h2><Wheat size={16} /> Permintaan: {ingredient.name}</h2>
            <p className="sub">SPPG Garut Pusat · <Pencil size={11} style={{ verticalAlign: -1 }} /> jumlah &amp; harga bisa diedit langsung</p>
            {!!ingredient.qtyPerPortion && (
              <p className="sub" style={{ marginTop: -8 }}>
                ≈ {ingredient.qtyPerPortion}{ingredient.unit}/porsi × {pax} porsi
              </p>
            )}
            <div className="demand-headline">
              <input
                className="plain-input num" type="number" min="1"
                value={ingredient.demand}
                onChange={(e) => {
                  const demand = Math.max(1, Number(e.target.value) || 1);
                  updateIngredient(ingredient.id, { demand, qtyPerPortion: round2(demand / pax) });
                }}
              />
              <span className="unit">{ingredient.unit} {ingredient.name.toLowerCase()}</span>
            </div>
            <div className="demand-compare">
              Distributor Jakarta:
              <input
                className="plain-input mono" type="number" min="1"
                value={ingredient.distributorPrice}
                onChange={(e) => updateIngredient(ingredient.id, { distributorPrice: Math.max(1, Number(e.target.value) || 1) })}
              />
              /{ingredient.unit}, {ingredient.distributorDays} hari · sekaligus jadi batas harga (budget cap)
            </div>
            {resetHint[ingredient.id] && (
              <div className="hint"><AlertTriangle size={13} /> Harga/satuan diubah — balasan lama di-reset, kirim ulang permintaan.</div>
            )}

            <div className="row-actions">
              {(st === "idle" || st === "error") && (
                <button className="btn btn-primary" onClick={() => broadcastOne(ingredient)}>
                  <Send size={15} /> Kirim bahan ini saja {mode === "live" ? "(WA sungguhan)" : ""}
                </button>
              )}
              {st === "sending" && <span className="status-badge status-sending"><Radio size={12} /> Mengirim broadcast WhatsApp…</span>}
              {st === "receiving" && (
                <span className="status-badge status-receiving">
                  <MessageCircle size={12} /> Menerima balasan… {tickerItems.length > 0 && `${tickerItems.length} masuk`}
                </span>
              )}
              {st === "done" && (
                <>
                  <span className="status-badge status-done"><CheckCircle2 size={12} /> {tickerItems.length} balasan · {offerCount} penawaran</span>
                  <button className="btn-ghost" onClick={() => resetIngredient(ingredient.id)}><RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Ulangi</button>
                </>
              )}
              {st === "error" && <span className="status-badge status-error"><AlertTriangle size={12} /> {errMsg[ingredient.id]}</span>}
              {(st === "receiving" && mode === "live") && (
                <button className="btn-ghost" onClick={() => resetIngredient(ingredient.id)}><RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Reset</button>
              )}
              {ingredients.length > 1 && (
                <button className="btn-danger" onClick={() => removeIngredient(ingredient.id)}><Trash2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Hapus bahan ini</button>
              )}
            </div>
          </div>

          <div className="card">
            <h2><MessageCircle size={16} /> Papan balasan WhatsApp</h2>
            <p className="sub">
              {mode === "live"
                ? "Semua balasan untuk permintaan ini — satu pesan petani bisa berisi beberapa bahan sekaligus"
                : "Bahasa santai petani → data terstruktur. Balasan kosong & ambigu ikut ditampilkan supaya kelihatan AI-nya menyaring."}
            </p>
            <div className="ticker-list">
              {tickerItems.length === 0 && <div className="empty-hint">Belum ada balasan. Kirim permintaan dulu.</div>}
              {tickerItems.map((t, i) => (
                <div className={"ticker-item " + t.kind} key={t.key + "-" + i}>
                  <div className="row1">
                    <span>{t.farmer.name}{t.farmer.desa ? ` · ${t.farmer.desa}` : ""}</span>
                    {t.farmer.distanceKm != null && <span>{t.farmer.distanceKm} km</span>}
                  </div>
                  <div className="raw">"{t.text}"</div>
                  <div className="parsed">
                    {t.kind === "offer" && (
                      <>
                        {t.items?.length > 0 ? (
                          t.items.map((it, j) => (
                            <span className="pill" key={j}>
                              {it.commodity ? it.commodity + " " : ""}{it.qty} @ {fmtRp(it.price_per_unit)}
                            </span>
                          ))
                        ) : (
                          <>
                            {t.qty != null && <span className="pill">{t.qty}{ingredient.unit}</span>}
                            {t.harga != null && <span className="pill">{fmtRp(t.harga)}/{ingredient.unit}</span>}
                          </>
                        )}
                        <span className="tag-ai"><Sparkles size={11} /> diproses AI</span>
                      </>
                    )}
                    {t.kind === "decline" && (
                      <span className="tag-decline"><XCircle size={11} /> tidak ada stok — difilter otomatis</span>
                    )}
                    {t.kind === "unclear" && (
                      <span className="tag-unclear"><HelpCircle size={11} /> ambigu — AI minta klarifikasi via WA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2><Users size={16} /> Rekomendasi petani (terurut AI)</h2>
            <p className="sub">
              Jarak 40% (absolut, 0–30km) · harga 35% (rasio ke termurah) · reliabilitas 25%
              {mode === "live" ? " — dihitung PostGIS di database" : ""}
            </p>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: -8, marginBottom: 6 }}>
              {totalQty}/{ingredient.demand} {ingredient.unit} terkonfirmasi
              {totalQty > 0 && ` · rata-rata ${fmtRp(avgLocal)}/${ingredient.unit} (hemat ${savingsPct.toFixed(0)}%)`}
            </div>
            {ranked.length === 0 && <div className="empty-hint">Daftar akan muncul setelah petani membalas.</div>}
            {ranked.map((r, i) => {
              const isConfirmed = confirmedList.includes(r.key);
              return (
                <div className="rank-row" key={r.key}>
                  <span className="rank-num">#{i + 1}</span>
                  <div className="rank-main">
                    <div className="name">{r.farmer.name} <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>· {r.farmer.desa}</span></div>
                    <div className="meta">
                      <span className="mono">{r.qty}{ingredient.unit}</span>
                      <span className="mono">{fmtRp(r.harga)}/{ingredient.unit}</span>
                      <span><MapPin size={10} style={{ verticalAlign: -1 }} /> {r.farmer.distanceKm}km</span>
                      <span>reliabilitas {r.farmer.reliability}%</span>
                    </div>
                    <div className="score-bar"><div className="score-bar-fill" style={{ width: `${Math.min(100, r.score * 100)}%` }} /></div>
                  </div>
                  <button className={"confirm-btn" + (isConfirmed ? " on" : "")} onClick={() => toggleConfirm(r)}>
                    {isConfirmed ? "✓ Terkonfirmasi" : "Konfirmasi"}
                  </button>
                </div>
              );
            })}
            {overCount > 0 && (
              <div className="over-note">
                <XCircle size={13} /> {overCount} penawaran di atas harga distributor ({fmtRp(ingredient.distributorPrice)}) — otomatis dikeluarkan dari ranking.
              </div>
            )}
          </div>

          {confirmedRows.length > 0 && (
            <div className="card logistics">
              <h2><Truck size={16} /> Logistik penjemputan {demandMet ? "— kebutuhan terpenuhi" : "— sebagian terkonfirmasi"}</h2>
              <div className="logi-grid">
                <div><div className="k">Agregator</div><div className="v">{LOGISTICS.aggregator}</div></div>
                <div><div className="k">Jadwal jemput</div><div className="v">{LOGISTICS.schedule}</div></div>
                <div><div className="k">Titik kumpul</div><div className="v">{LOGISTICS.meetingPoint}</div></div>
              </div>
              <div className="logi-note">
                <CheckCircle2 size={13} />
                Konfirmasi WhatsApp {mode === "live" ? "terkirim" : "terkirim (simulasi)"} ke {confirmedRows.length} petani · total {fmtRp(localCost)} tetap berputar di Garut
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="card">
            <h2><MapPin size={16} /> Peta radius petani</h2>
            <p className="sub">Jarak dari dapur SPPG (lingkaran = 10 / 20 / 30 km)</p>
            <div className="radar-wrap">
              <svg viewBox="0 0 400 400" width="100%" style={{ maxWidth: 340 }} role="img" aria-label="Peta radius petani di sekitar SPPG">
                {[10, 20, 30].map((km) => <circle key={km} cx={CX} cy={CY} r={(km / MAXKM) * R} fill="none" stroke="#D8CD9C" strokeWidth="1" />)}
                {[10, 20, 30].map((km) => <text key={"t" + km} x={CX + 4} y={CY - (km / MAXKM) * R} fontSize="9" fill="#8C8562" fontFamily="var(--font-spacemono),monospace">{km}km</text>)}
                {(mode === "sim" ? FARMER_PROFILES : ranked.map((r) => r.farmer)).map((f) => {
                  const p = pos(f);
                  const replied = repliedFarmerIds.has(f.id) || mode === "live";
                  const isConf = confirmedFarmerIds.has(f.id);
                  const color = isConf ? "#3D7A4C" : replied ? "#D9A62E" : "#CBBF8E";
                  const rr = isConf ? 7 : replied ? 5.5 : 3.5;
                  return (
                    <g key={f.id}>
                      {isConf && <line x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#3D7A4C" strokeWidth="1" strokeDasharray="4 3" opacity=".6" />}
                      <circle cx={p.x} cy={p.y} r={rr} fill={color} opacity={replied || isConf ? 1 : 0.55} />
                    </g>
                  );
                })}
                <rect x={CX - 11} y={CY - 11} width="22" height="22" rx="6" fill="#B0522C" />
                <text x={CX} y={CY + 4} fontSize="11" fill="#FBF8EC" textAnchor="middle">▲</text>
              </svg>
            </div>
            <div className="radar-legend">
              <span><span className="legend-dot" style={{ background: "#B0522C" }} />Dapur SPPG</span>
              <span><span className="legend-dot" style={{ background: "#CBBF8E" }} />Terdaftar</span>
              <span><span className="legend-dot" style={{ background: "#D9A62E" }} />Menawar</span>
              <span><span className="legend-dot" style={{ background: "#3D7A4C" }} />Terkonfirmasi</span>
            </div>
          </div>

          <div className="card">
            <h2><Sparkles size={16} /> Ringkasan {ingredient.name.toLowerCase()}</h2>
            <div className="summary-grid">
              <div className="summary-tile"><div className="label">Balasan masuk</div><div className="value">{tickerItems.length}</div></div>
              <div className="summary-tile"><div className="label">Penawaran valid</div><div className="value">{ranked.length}</div></div>
              <div className="summary-tile"><div className="label">Terkonfirmasi</div><div className="value">{totalQty}{ingredient.unit}</div></div>
              <div className="summary-tile"><div className="label">Hemat vs distributor</div><div className={"value" + (savingsPct > 0 ? " good" : "")}>{savingsPct > 0 ? savingsPct.toFixed(0) + "%" : "—"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, textAlign: "center", fontSize: 11.5, color: "var(--ink-soft)" }}>
        Tanitera
      </div>
    </div>
  );
}