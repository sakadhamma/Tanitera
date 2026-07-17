"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ClipboardList, Truck, History, LayoutGrid,
  Users, AlertTriangle, Sprout,
} from "lucide-react";
import { LOGISTICS, getPickupSchedule, fmtRp } from "@/lib/sim";
import { supabaseBrowser } from "@/lib/supabase";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Overview() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [tab, setTab] = useState("ringkasan"); // "ringkasan" | "riwayat"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("confirmed_matches")
      .select("*")
      .order("confirmed_at", { ascending: false })
      .limit(300);
    setRows(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const overview = useMemo(() => {
    const latestItemPerCommodity = {};
    for (const r of rows) {
      const cur = latestItemPerCommodity[r.commodity_id];
      if (!cur || new Date(r.demand_created_at) > new Date(cur.demand_created_at)) {
        latestItemPerCommodity[r.commodity_id] = r;
      }
    }
    return Object.values(latestItemPerCommodity)
      .map((ref) => {
        const group = rows.filter((r) => r.demand_item_id === ref.demand_item_id);
        const confirmedQty = group.reduce((s, r) => s + Number(r.confirmed_qty_kg ?? r.offered_qty_kg), 0);
        const cost = group.reduce((s, r) => s + Number(r.confirmed_qty_kg ?? r.offered_qty_kg) * Number(r.price_per_kg), 0);
        const farmers = [...new Set(group.map((r) => r.farmer_name))];
        return {
          commodity: ref.commodity, unit: ref.unit,
          targetQty: Number(ref.target_qty_kg), confirmedQty, cost,
          farmers, weekStart: ref.week_start, pax: ref.pax,
          demandCreatedAt: ref.demand_created_at,
        };
      })
      .sort((a, b) => a.commodity.localeCompare(b.commodity));
  }, [rows]);

  const totalCost = overview.reduce((s, o) => s + o.cost, 0);
  const totalFarmers = new Set(overview.flatMap((o) => o.farmers)).size;

  return (
    <div style={{ padding: 22 }}>
      <style>{`
        .ov-topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
        .back-btn { display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:8px 14px; font-size:12.5px; font-weight:700; color:var(--sawah-deep); cursor:pointer; font-family:inherit; }
        .ov-tabs { display:flex; border:1.5px solid var(--line); border-radius:999px; overflow:hidden; background:var(--card); }
        .ov-tab-btn { border:none; background:transparent; padding:8px 16px; font-size:12.5px; font-weight:700; color:var(--ink-soft); cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; }
        .ov-tab-btn.on { background:var(--sawah); color:#F4EFD9; }
        .ov-header { display:flex; gap:12px; align-items:center; border-bottom:2px solid var(--sawah); padding-bottom:18px; margin-bottom:20px; }
        .ov-icon { width:46px; height:46px; border-radius:10px; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; }
        .ov-header h1 { font-size:24px; font-weight:700; margin:0; color:var(--sawah-deep); }
        .ov-header p { margin:2px 0 0; font-size:12.5px; color:var(--ink-soft); }
        .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; margin-bottom:16px; }
        .card h2 { font-size:15px; font-weight:600; margin:0 0 4px; color:var(--sawah-deep); display:flex; align-items:center; gap:8px; }
        .card .sub { font-size:12px; color:var(--ink-soft); margin:0 0 14px; }
        .ov-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
        @media (max-width:700px){ .ov-summary { grid-template-columns:1fr; } }
        .ov-tile { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
        .ov-tile .k { font-size:11px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.03em; }
        .ov-tile .v { font-family:var(--font-spacemono),monospace; font-weight:700; font-size:18px; color:var(--sawah-deep); margin-top:4px; }
        .logi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media (max-width:700px){ .logi-grid { grid-template-columns:1fr; } }
        .logi-grid .k { font-size:11px; color:var(--ink-soft); font-weight:700; text-transform:uppercase; letter-spacing:.03em; }
        .logi-grid .v { font-size:13.5px; font-weight:700; color:var(--sawah-deep); margin-top:3px; }
        .commodity-row { border-top:1px solid var(--line); padding:12px 0; }
        .commodity-row:first-of-type { border-top:none; }
        .commodity-row .top { display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; }
        .commodity-row .name { font-weight:700; color:var(--sawah-deep); font-size:14px; }
        .commodity-row .qty { font-family:var(--font-spacemono),monospace; font-weight:700; font-size:13px; }
        .commodity-row .qty.met { color:var(--green-ok); }
        .commodity-row .farmers { font-size:11.5px; color:var(--ink-soft); margin-top:4px; }
        .bar-track { height:6px; border-radius:99px; background:var(--line); margin-top:8px; overflow:hidden; }
        .bar-fill { height:100%; background:var(--sawah); border-radius:99px; }
        .bar-fill.met { background:var(--green-ok); }
        .hist-row { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--line); font-size:12.5px; }
        .hist-row:first-of-type { border-top:none; }
        .hist-row .n { font-weight:700; color:var(--sawah-deep); }
        .hist-row .d { color:var(--ink-soft); font-size:11.5px; margin-top:2px; }
        .hist-row .amt { text-align:right; font-family:var(--font-spacemono),monospace; font-weight:700; color:var(--sawah-deep); white-space:nowrap; }
        .hist-row .amt .t { display:block; font-size:10.5px; color:var(--ink-soft); font-family:inherit; font-weight:600; }
      `}</style>

      <div className="ov-topbar">
        <button className="back-btn" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={14} /> Kembali ke Dashboard
        </button>
        <div className="ov-tabs">
          <button className={"ov-tab-btn" + (tab === "ringkasan" ? " on" : "")} onClick={() => setTab("ringkasan")}>
            <LayoutGrid size={13} /> Ringkasan
          </button>
          <button className={"ov-tab-btn" + (tab === "riwayat" ? " on" : "")} onClick={() => setTab("riwayat")}>
            <History size={13} /> Riwayat
          </button>
        </div>
      </div>

      <div className="ov-header">
        <div className="ov-icon"><ClipboardList size={22} /></div>
        <div>
          <h1>Overview &amp; Riwayat</h1>
          <p>
            {tab === "ringkasan"
              ? "Semua item yang sudah terkonfirmasi minggu ini, plus info penjemputan"
              : "Riwayat penawaran petani yang sudah dikonfirmasi SPPG"}
          </p>
        </div>
      </div>

      {!supabase ? (
        <div className="card">
          <h2><AlertTriangle size={16} /> Butuh mode live</h2>
          <p className="sub">
            Halaman ini baca langsung dari database. Isi kredensial Supabase di
            <span className="mono"> .env.local</span> dulu, lalu buka lagi halaman ini.
          </p>
        </div>
      ) : loading ? (
        <div className="card"><p className="sub" style={{ margin: 0 }}>Memuat data konfirmasi…</p></div>
      ) : rows.length === 0 ? (
        <div className="card">
          <h2><Sprout size={16} /> Belum ada konfirmasi</h2>
          <p className="sub" style={{ margin: 0 }}>Belum ada penawaran petani yang dikonfirmasi. Kirim blast dari Dashboard, lalu konfirmasi tawaran yang masuk.</p>
        </div>
      ) : tab === "ringkasan" ? (
        <>
          <div className="ov-summary">
            <div className="ov-tile"><div className="k">Total biaya terkonfirmasi</div><div className="v">{fmtRp(totalCost)}</div></div>
            <div className="ov-tile"><div className="k">Komoditas terkonfirmasi</div><div className="v">{overview.length}</div></div>
            <div className="ov-tile"><div className="k">Petani terlibat</div><div className="v">{totalFarmers}</div></div>
          </div>

          <div className="card">
            <h2><Truck size={16} /> Logistik penjemputan</h2>
            <p className="sub">Berlaku untuk seluruh konfirmasi minggu ini</p>
            <div className="logi-grid">
              <div><div className="k">Agregator</div><div className="v">{LOGISTICS.aggregator}</div></div>
              <div><div className="k">Jadwal jemput</div><div className="v">{getPickupSchedule()}</div></div>
              <div><div className="k">Titik kumpul</div><div className="v">{LOGISTICS.meetingPoint}</div></div>
            </div>
          </div>

          <div className="card">
            <h2><Users size={16} /> Item terkonfirmasi per komoditas</h2>
            <p className="sub">Dihitung dari permintaan terbaru tiap komoditas</p>
            {overview.map((o) => {
              const pct = o.targetQty > 0 ? Math.min(100, Math.round((o.confirmedQty / o.targetQty) * 100)) : 100;
              const met = o.confirmedQty >= o.targetQty;
              return (
                <div className="commodity-row" key={o.commodity}>
                  <div className="top">
                    <span className="name">{o.commodity}</span>
                    <span className={"qty" + (met ? " met" : "")}>
                      {o.confirmedQty}{o.unit} / {o.targetQty}{o.unit} · {fmtRp(o.cost)}
                    </span>
                  </div>
                  <div className="farmers">{o.farmers.length} petani: {o.farmers.join(", ")}</div>
                  <div className="bar-track"><div className={"bar-fill" + (met ? " met" : "")} style={{ width: pct + "%" }} /></div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="card">
          <h2><History size={16} /> Riwayat konfirmasi ({rows.length})</h2>
          <p className="sub">Terbaru di atas — semua penawaran petani yang sudah dikonfirmasi SPPG</p>
          {rows.map((r) => (
            <div className="hist-row" key={r.match_id}>
              <div>
                <div className="n">{r.farmer_name} · {r.commodity}</div>
                <div className="d">{r.kecamatan}{r.gapoktan ? ` · ${r.gapoktan}` : ""} · {fmtDate(r.confirmed_at)}</div>
              </div>
              <div className="amt">
                {fmtRp((r.confirmed_qty_kg ?? r.offered_qty_kg) * r.price_per_kg)}
                <span className="t">{r.confirmed_qty_kg ?? r.offered_qty_kg}{r.unit} @ {fmtRp(r.price_per_kg)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
