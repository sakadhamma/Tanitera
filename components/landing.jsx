"use client";

import { useRouter } from "next/navigation";
import {
  Sprout, Sparkles, ArrowUpRight, MessageCircle, Wheat, Search, Heart,
  Smartphone, Route, Handshake,
} from "lucide-react";
import { DEFAULT_INGREDIENTS, ROSTER_SIZE } from "@/lib/sim";

export default function Landing() {
  const router = useRouter();
  const goDash = () => router.push("/dashboard");
  const ingredients = DEFAULT_INGREDIENTS;

  return (
    <div style={{ padding: "22px 22px 0" }}>
      <style>{`
        .nav { display:flex; align-items:center; justify-content:space-between; padding-bottom:18px; }
        .nav-logo { display:flex; align-items:center; gap:9px; font-family:var(--font-fraunces),serif; font-weight:700; font-size:19px; color:var(--sawah-deep); }
        .nav-logo .box { width:32px; height:32px; border-radius:8px; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; }
        .nav-links { display:flex; gap:26px; font-size:13.5px; font-weight:600; color:var(--ink-soft); }
        .nav-links a { text-decoration:none; }
        .nav-links a:hover { color: var(--sawah-deep); }
        .nav-icons { display:flex; align-items:center; gap:14px; color: var(--sawah-deep); }
        .nav-cta { background:var(--sawah); color:#F4EFD9; border:none; border-radius:999px; padding:9px 16px; font-weight:700; font-size:12.5px; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; }
        @media (max-width:820px){ .nav-links{ display:none; } }
        .hero { display:grid; grid-template-columns: 1.35fr 0.95fr 0.7fr; gap:6px; border-radius:20px; overflow:hidden; min-height:460px; }
        @media (max-width:820px){ .hero{ grid-template-columns:1fr; min-height:unset; } }
        .hero-panel { position:relative; overflow:hidden; }
        .hero-main { background: linear-gradient(180deg, #4a6b4e 0%, #2f4a34 55%, #1a2a1e 100%); padding:34px 28px 26px; display:flex; flex-direction:column; justify-content:space-between; color:#F4EFD9; }
        .eyebrow { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:#CFE3B8; font-weight:700; }
        .hero-main h1 { font-size:35px; line-height:1.12; font-weight:700; margin:10px 0 12px; max-width:420px; }
        .hero-main h1 .accent { color: var(--gold); }
        .hero-main p { font-size:13.5px; color:#DCE6CE; max-width:360px; margin:0 0 18px; }
        .hero-ctas { display:flex; gap:10px; flex-wrap:wrap; }
        .hero-chips { display:flex; gap:10px; flex-wrap:wrap; margin-top:22px; }
        .chip { background:rgba(244,239,217,.12); border:1px solid rgba(244,239,217,.25); border-radius:12px; padding:9px 13px; display:flex; align-items:center; gap:9px; }
        .chip .big { font-family:var(--font-fraunces),serif; font-weight:800; font-size:19px; }
        .chip .small { font-size:10px; color:#CFE3B8; line-height:1.2; }
        .chip .avatars { display:flex; }
        .chip .avatars span { width:20px; height:20px; border-radius:50%; border:1.5px solid #2f4a34; margin-left:-6px; display:inline-block; }
        .hero-chat { background: var(--sawah-deep); padding:20px; display:flex; flex-direction:column; justify-content:center; gap:10px; }
        .wa-bubble { background:#FBF8EC; border-radius:12px 12px 12px 2px; padding:10px 12px; font-size:11.5px; color:var(--ink); max-width:92%; box-shadow:0 3px 0 rgba(0,0,0,.08); }
        .wa-bubble.out { align-self:flex-end; background:var(--gold); border-radius:12px 12px 2px 12px; color:#2A1D06; font-weight:600; }
        .wa-meta { font-size:9px; color:var(--ink-soft); margin-top:3px; text-align:right; }
        .wa-tag { display:flex; align-items:center; gap:6px; color:#CFE3B8; font-size:10.5px; font-weight:700; margin-bottom:4px; }
        .hero-crate { background: repeating-linear-gradient(135deg, #E2D6A0 0 14px, #DACD9C 14px 28px); padding:18px; display:flex; align-items:flex-end; justify-content:center; }
        @media (max-width:820px){ .hero-chat, .hero-crate { min-height:150px; } }
        .hero-foot-strip { display:flex; justify-content:space-between; align-items:center; padding:16px 4px 0; font-size:11px; color:var(--ink-soft); flex-wrap:wrap; gap:10px;}
        .about { padding: 54px 6px 10px; display:grid; grid-template-columns: 0.85fr 1.4fr; gap:30px; }
        @media (max-width:820px){ .about{ grid-template-columns:1fr; } }
        .about-label { font-size:12px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.08em; }
        .about h2 { font-size:30px; font-weight:700; color:var(--sawah-deep); margin:8px 0 0; }
        .about h2 u { color: var(--gold-deep); text-decoration-color: var(--gold); }
        .about-copy { display:flex; gap:22px; font-size:13.5px; color:var(--ink-soft); line-height:1.6; margin-top:16px; }
        .about-copy p { margin:0; flex:1; }
        .services { padding: 54px 6px 10px; }
        .services-head { display:flex; justify-content:space-between; align-items:center; }
        .services-head h2 { font-size:26px; font-weight:700; color:var(--sawah-deep); display:flex; align-items:center; gap:8px; }
        .btn-pill-outline { background:var(--card); border:1.5px solid var(--sawah); color:var(--sawah); border-radius:999px; padding:9px 16px; font-weight:700; font-size:12.5px; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; }
        .services-copy { max-width: 480px; margin-top:22px; }
        .services-copy p { font-size:13px; color:var(--ink-soft); line-height:1.65; }
        .flow-illus { margin-top:14px; border-radius:14px; background: linear-gradient(170deg,#3c5d3f,#1c2b1e); min-height:160px; padding:18px; display:flex; flex-direction:column; justify-content:center; gap:8px; }
        .flow-line { display:flex; align-items:center; gap:8px; color:#EFE9C9; font-size:12px; font-weight:700; }
        .land-footer { text-align:center; font-size:11px; color:var(--ink-soft); padding-bottom:22px; }
      `}</style>

      <div className="nav">
        <div className="nav-logo"><div className="box"><Sprout size={17} /></div>TaniSPPG</div>
        <div className="nav-links">
          <a href="#tentang">Tentang</a>
          <a href="#cara-kerja">Cara Kerja</a>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="nav-icons"><Search size={16} /><Heart size={16} /></div>
          <button className="nav-cta" onClick={goDash}>Buka Dashboard <ArrowUpRight size={14} /></button>
        </div>
      </div>

      <div className="hero">
        <div className="hero-panel hero-main">
          <div>
            <div className="eyebrow">Program Makan Bergizi Gratis · Garut</div>
            <h1>Dari sawah ke dapur MBG, tanpa lewat <span className="accent">Jakarta</span></h1>
            <p>TaniSPPG menghubungkan dapur SPPG langsung dengan petani lokal lewat WhatsApp — bukan aplikasi baru, cuma pesan yang sudah biasa mereka pakai.</p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={goDash}>Buka Dashboard <ArrowUpRight size={15} /></button>
              <a href="#cara-kerja" className="btn btn-outline">Lihat cara kerja</a>
            </div>
          </div>
          <div className="hero-chips">
            <div className="chip">
              <div className="avatars"><span style={{ background: "#D9A62E" }} /><span style={{ background: "#B0522C" }} /><span style={{ background: "#8FAE7E" }} /></div>
              <div><div className="big">{ROSTER_SIZE}</div><div className="small">Petani<br />terdaftar</div></div>
            </div>
            <div className="chip">
              <Wheat size={16} color="#D9A62E" />
              <div><div className="small">Bahan aktif</div><div style={{ fontSize: 11, fontWeight: 700 }}>{ingredients.length} jenis diminta</div></div>
            </div>
          </div>
        </div>

        <div className="hero-panel hero-chat">
          <div className="wa-tag"><MessageCircle size={13} /> WhatsApp — Grup Petani Garut</div>
          <div className="wa-bubble out">SPPG Garut butuh 200kg wortel minggu depan. Balas: YA [jumlah] [harga]</div>
          <div className="wa-bubble">ada wortel 60kg pak, harga 8500/kg ya<div className="wa-meta">Pak Ujang, Cikajang ✓✓</div></div>
          <div className="wa-bubble">punya 80kg pak harga 8rb<div className="wa-meta">Bu Euis, Pasirwangi ✓✓</div></div>
        </div>

        <div className="hero-panel hero-crate">
          <svg viewBox="0 0 160 220" width="100%" style={{ maxWidth: 150 }} aria-hidden="true">
            <rect x="10" y="120" width="140" height="80" rx="6" fill="#8a6a3a" />
            <rect x="10" y="120" width="140" height="14" fill="#6f5329" />
            {[28, 58, 88, 118].map((x, i) => <rect key={i} x={x} y="120" width="4" height="80" fill="#6f5329" />)}
            <circle cx="55" cy="105" r="26" fill="#B0522C" />
            <circle cx="95" cy="100" r="30" fill="#3D7A4C" />
            <circle cx="120" cy="118" r="20" fill="#D9A62E" />
            <path d="M55 79 l6 -14 l6 14 z" fill="#3D7A4C" />
          </svg>
        </div>
      </div>

      <div className="hero-foot-strip">
        <span>Konsep pitch · Garuda Hacks 7.0</span>
      </div>

      <div className="about" id="tentang">
        <div>
          <div className="about-label">Masalah</div>
          <h2>Uang MBG <u>mengalir keluar</u> desa</h2>
        </div>
        <div>
          <div className="about-copy">
            <p>Dana MBG seharusnya menghidupkan ekonomi desa lewat pembelian bahan lokal. Tapi tanpa daftar petani yang jelas dan cara menggabungkan hasil panen kecil, SPPG lebih gampang pesan ke distributor besar di luar kota.</p>
            <p>TaniSPPG membalik alurnya: SPPG posting kebutuhan apa saja, petani balas lewat WhatsApp, AI merangking otomatis berdasarkan jarak, harga, dan keandalan.</p>
          </div>
        </div>
      </div>

      <div className="services" id="cara-kerja">
        <div className="services-head">
          <h2><Route size={22} /> Cara Kerja</h2>
          <button className="btn-pill-outline" onClick={goDash}>Coba Simulasi <ArrowUpRight size={13} /></button>
        </div>
        <div className="services-copy">
          <p>Semua alur dirancang supaya petani tidak perlu belajar aplikasi baru — cukup balas WhatsApp seperti biasa, dengan bahasa dan ejaan apa adanya. AI yang menyesuaikan, bukan sebaliknya.</p>
          <div className="flow-illus">
            <div className="flow-line"><Smartphone size={15} color="#D9A62E" /> Tanpa install app</div>
            <div className="flow-line"><Sparkles size={15} color="#D9A62E" /> AI baca bahasa santai</div>
            <div className="flow-line"><Handshake size={15} color="#D9A62E" /> Koperasi urus logistik</div>
          </div>
        </div>
      </div>

      <div className="land-footer">TaniSPPG — konsep untuk Garuda Hacks 7.0</div>
    </div>
  );
}