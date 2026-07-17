"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Users, CheckCircle2, AlertTriangle, Sprout, Pencil, X, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

const KECAMATAN = [
  "Garut Kota","Cilawu","Bayongbong","Samarang","Tarogong Kaler",
  "Karangpawitan","Cikajang","Cisurupan","Banyuresmi","Leles",
];

export default function Farmers() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [farmers, setFarmers] = useState([]);
  const [form, setForm] = useState({ name: "", wa_number: "", kecamatan: KECAMATAN[0], gapoktan: "", commodities: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [editingId, setEditingId] = useState(null); // null = adding new farmer

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("farmers")
      .select("id, name, wa_number, kecamatan, gapoktan, reliability_score, verified_by, farmer_commodities(commodities(name))")
      .order("created_at", { ascending: false })
      .limit(100);
    setFarmers(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim() || !form.wa_number.trim()) {
      setMsg({ ok: false, text: "Nama dan nomor WA wajib diisi." });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      const url = editingId ? `/api/farmers/${editingId}` : "/api/farmers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setMsg({
        ok: true,
        text: editingId
          ? `${form.name} diperbarui.`
          : `${form.name} terdaftar. Blast berikutnya otomatis menjangkau petani ini.`,
      });
      setForm({ name: "", wa_number: "", kecamatan: form.kecamatan, gapoktan: "", commodities: "" });
      setEditingId(null);
      load();
    } catch (e) {
      setMsg({ ok: false, text: String(e.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setMsg(null);
    setForm({
      name: f.name,
      wa_number: f.wa_number,
      kecamatan: f.kecamatan,
      gapoktan: f.gapoktan || "",
      commodities: (f.farmer_commodities || []).map((fc) => fc.commodities?.name).filter(Boolean).join(", "),
    });
  };

  const deleteFarmer = async (f) => {
    if (!confirm(`Hapus ${f.name}? Tidak bisa dibatalkan.`)) return;
    const res = await fetch(`/api/farmers/${f.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: data.error || "Gagal menghapus petani" });
      return;
    }
    if (editingId === f.id) cancelEdit(); // don't leave the form pointed at a deleted farmer
    load();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMsg(null);
    setForm({ name: "", wa_number: "", kecamatan: KECAMATAN[0], gapoktan: "", commodities: "" });
  };

  return (
    <div style={{ padding: 22 }}>
      <style>{`
        .farm-topbar { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
        .back-btn { display:flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:8px 14px; font-size:12.5px; font-weight:700; color:var(--sawah-deep); cursor:pointer; font-family:inherit; }
        .farm-header { display:flex; gap:12px; align-items:center; border-bottom:2px solid var(--sawah); padding-bottom:18px; margin-bottom:20px; }
        .farm-icon { width:46px; height:46px; border-radius:10px; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; }
        .farm-header h1 { font-size:24px; font-weight:700; margin:0; color:var(--sawah-deep); }
        .farm-header p { margin:2px 0 0; font-size:12.5px; color:var(--ink-soft); }
        .farm-grid { display:grid; grid-template-columns:.9fr 1.1fr; gap:20px; }
        @media (max-width:860px){ .farm-grid { grid-template-columns:1fr; } }
        .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; }
        .card h2 { font-size:15px; font-weight:600; margin:0 0 4px; color:var(--sawah-deep); display:flex; align-items:center; gap:8px; }
        .card .sub { font-size:12px; color:var(--ink-soft); margin:0 0 14px; }
        .form-col { display:flex; flex-direction:column; gap:12px; }
        .msg { font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:8px; }
        .msg.ok { background:#EDF3E8; color:var(--green-ok); }
        .msg.err { background:#F3D5C8; color:var(--clay); }
        .farmer-row { display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-top:1px solid var(--line); font-size:12.5px; }
        .farmer-row:first-of-type { border-top:none; }
        .farmer-row.editing { background:#FBF6E8; border-radius:8px; padding-left:8px; padding-right:8px; }
        .farmer-row .n { font-weight:700; color:var(--sawah-deep); }
        .farmer-row .d { color:var(--ink-soft); font-size:11.5px; margin-top:2px; }
        .farmer-row .comm { font-size:10.5px; color:var(--gold-deep); font-weight:700; margin-top:2px; }
        .farmer-row .rel { font-family:var(--font-spacemono),monospace; font-weight:700; color:var(--sawah-deep); white-space:nowrap; }
        .edit-btn { border:1.5px solid var(--line); background:transparent; color:var(--ink-soft); border-radius:999px; padding:5px 7px; cursor:pointer; display:flex; align-items:center; font-family:inherit; }
        .edit-btn:hover { border-color:var(--sawah); color:var(--sawah-deep); }
        .list-scroll { max-height:520px; overflow-y:auto; padding-right:4px; }
      `}</style>

      <div className="farm-topbar">
        <button className="back-btn" onClick={() => router.push("/dashboard")}>
          <ArrowLeft size={14} /> Kembali ke Dashboard
        </button>
      </div>

      <div className="farm-header">
        <div className="farm-icon"><Sprout size={22} /></div>
        <div>
          <h1>Kelola Petani</h1>
          <p>Daftarkan petani baru — data dari penyuluh/Gapoktan, diinput manual oleh SPPG</p>
        </div>
      </div>

      {!supabase ? (
        <div className="card">
          <h2><AlertTriangle size={16} /> Butuh mode live</h2>
          <p className="sub">
            Halaman ini menulis langsung ke database. Isi kredensial Supabase di
            <span className="mono"> .env.local</span> dulu (lihat INTEGRATION-GUIDE Step 3),
            lalu buka lagi halaman ini.
          </p>
        </div>
      ) : (
        <div className="farm-grid">
          <div className="card">
            <h2><UserPlus size={16} /> {editingId ? "Edit petani" : "Tambah petani"}</h2>
            <p className="sub">
              {editingId ? "Perbarui data petani ini — nomor WA lama otomatis berhenti dipakai" : "Petani baru langsung ikut ter-blast di permintaan berikutnya (radius 30km)"}
            </p>
            <div className="form-col">
              <div><span className="field-label">Nama</span>
                <input className="field-input" placeholder="Pak Dadang" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><span className="field-label">Nomor WhatsApp</span>
                <input className="field-input" placeholder="0812xxxxxxx / +62812xxxxxxx" value={form.wa_number}
                  onChange={(e) => setForm((f) => ({ ...f, wa_number: e.target.value }))} /></div>
              <div><span className="field-label">Kecamatan (menentukan jarak di peta)</span>
                <select className="field-input" value={form.kecamatan}
                  onChange={(e) => setForm((f) => ({ ...f, kecamatan: e.target.value }))}>
                  {KECAMATAN.map((k) => <option key={k} value={k}>{k}</option>)}
                </select></div>
              <div><span className="field-label">Gapoktan (opsional)</span>
                <input className="field-input" placeholder="Gapoktan Mekar Tani" value={form.gapoktan}
                  onChange={(e) => setForm((f) => ({ ...f, gapoktan: e.target.value }))} /></div>
              <div><span className="field-label">Komoditas (opsional, pisahkan koma — kosong = terima semua blast)</span>
                <input className="field-input" placeholder="wortel, tomat" value={form.commodities}
                  onChange={(e) => setForm((f) => ({ ...f, commodities: e.target.value }))} /></div>
              {msg && <div className={"msg " + (msg.ok ? "ok" : "err")}>
                {msg.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {msg.text}
              </div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" disabled={busy} onClick={submit}>
                  <UserPlus size={15} /> {busy ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Daftarkan petani"}
                </button>
                {editingId && (
                  <button className="btn-ghost" disabled={busy} onClick={cancelEdit}>
                    <X size={14} /> Batal
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2><Users size={16} /> Petani terdaftar ({farmers.length})</h2>
            <p className="sub">Reliabilitas mulai 0.70, naik/turun otomatis dari riwayat pengiriman</p>
            <div className="list-scroll">
              {farmers.map((f) => (
                <div className={"farmer-row" + (editingId === f.id ? " editing" : "")} key={f.id}>
                  <div>
                    <div className="n">{f.name}</div>
                    <div className="d">{f.wa_number} · {f.kecamatan}{f.gapoktan ? ` · ${f.gapoktan}` : ""}</div>
                    {f.farmer_commodities?.length > 0 && (
                      <div className="comm">{f.farmer_commodities.map((fc) => fc.commodities?.name).filter(Boolean).join(", ")}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="rel">{Number(f.reliability_score).toFixed(2)}</div>
                    <button className="edit-btn" onClick={() => startEdit(f)} title="Edit petani ini">
                      <Pencil size={12} />
                    </button>
                    <button className="edit-btn" onClick={() => deleteFarmer(f)} title="Hapus petani ini">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {farmers.length === 0 && <p className="sub">Belum ada petani — jalankan seed schema.sql atau tambah manual.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}