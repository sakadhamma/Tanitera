"use client";

import { useRouter } from "next/navigation";
import {
  Sprout, Sparkles, ArrowUpRight, MessageCircle, Smartphone, Route, Handshake, Send,
} from "lucide-react";

export default function Landing() {
  const router = useRouter();
  const goDash = () => router.push("/dashboard");

  return (
    <div style={{ padding: "22px 22px 0" }}>
      <style>{`
        .nav { display:flex; align-items:center; justify-content:space-between; padding-bottom:18px; }
        .nav-logo { display:flex; align-items:center; gap:9px; font-family:var(--font-fraunces),serif; font-weight:700; font-size:19px; color:var(--sawah-deep); }
        .nav-logo .box { width:32px; height:32px; border-radius:8px; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; }
        .nav-links { display:flex; gap:26px; font-size:13.5px; font-weight:600; color:var(--ink-soft); }
        .nav-links a { text-decoration:none; }
        .nav-links a:hover { color: var(--sawah-deep); }
        .nav-cta { background:var(--sawah); color:#F4EFD9; border:none; border-radius:999px; padding:9px 16px; font-weight:700; font-size:12.5px; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; }
        @media (max-width:820px){ .nav-links{ display:none; } }
        .hero { display:grid; grid-template-columns: 1.35fr 0.95fr 0.7fr; gap:6px; border-radius:20px; overflow:hidden; min-height:460px; }
        @media (max-width:820px){ .hero{ grid-template-columns:1fr; min-height:unset; } }
        .hero-panel { position:relative; overflow:hidden; }
        .hero-main { background: linear-gradient(180deg, #4a6b4e 0%, #2f4a34 55%, #1a2a1e 100%); padding:34px 28px 26px; display:flex; flex-direction:column; justify-content:center; color:#F4EFD9; }
        .eyebrow { font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:#CFE3B8; font-weight:700; }
        .hero-main h1 { font-size:35px; line-height:1.12; font-weight:700; margin:10px 0 12px; max-width:420px; }
        .hero-main h1 .accent { color: var(--gold); }
        .hero-main p { font-size:13.5px; color:#DCE6CE; max-width:360px; margin:0 0 18px; }
        .hero-ctas { display:flex; gap:10px; flex-wrap:wrap; }
        .hero-chat { background: var(--sawah-deep); padding:20px; display:flex; flex-direction:column; justify-content:center; gap:10px; }
        .wa-bubble { background:#FBF8EC; border-radius:12px 12px 12px 2px; padding:10px 12px; font-size:11.5px; color:var(--ink); max-width:92%; box-shadow:0 3px 0 rgba(0,0,0,.08); }
        .wa-bubble.out { align-self:flex-end; background:var(--gold); border-radius:12px 12px 2px 12px; color:#2A1D06; font-weight:600; }
        .wa-meta { font-size:9px; color:var(--ink-soft); margin-top:3px; text-align:right; }
        .wa-tag { display:flex; align-items:center; gap:6px; color:#CFE3B8; font-size:10.5px; font-weight:700; margin-bottom:4px; }
        .hero-crate { background: repeating-linear-gradient(135deg, #E2D6A0 0 14px, #DACD9C 14px 28px); padding:18px; display:flex; align-items:flex-end; justify-content:center; }
        @media (max-width:820px){ .hero-chat, .hero-crate { min-height:150px; } }
        .about { padding: 54px 6px 10px; display:grid; grid-template-columns: 0.85fr 1.4fr; gap:30px; }
        @media (max-width:820px){ .about{ grid-template-columns:1fr; } }
        .about-label { font-size:12px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.08em; }
        .about h2 { font-size:30px; font-weight:700; color:var(--sawah-deep); margin:8px 0 0; }
        .about h2 u { color: var(--gold-deep); text-decoration-color: var(--gold); }
        .about-copy { display:flex; gap:22px; font-size:13.5px; color:var(--ink-soft); line-height:1.6; margin-top:16px; }
        .about-copy p { margin:0; flex:1; }
        .flow-grid { margin-top:7px; display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }        
        @media (max-width:820px){ .flow-grid{ grid-template-columns:1fr; } }
        .flow-card { background: linear-gradient(170deg,#3c5d3f,#1c2b1e); border-radius:14px; padding:22px 20px; color:#EFE9C9; }
        .flow-card .step-icon { width:36px; height:36px; border-radius:10px; background:rgba(217,166,46,.18); color:var(--gold); display:flex; align-items:center; justify-content:center; margin:0 0 12px; }
        .flow-card h3 { font-size:14.5px; font-weight:700; margin:0 0 6px; }
        .flow-card p { font-size:12px; color:#CFE3B8; margin:0; line-height:1.5; }
        .services { padding: 40px 6px 10px; }
        .services-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:7px; }
        .services-head h2 { font-size:26px; font-weight:700; color:var(--sawah-deep); display:flex; align-items:center; gap:8px; margin:0; }
        .btn-pill-outline { background:var(--card); border:1.5px solid var(--sawah); color:var(--sawah); border-radius:999px; padding:9px 16px; font-weight:700; font-size:12.5px; display:flex; align-items:center; gap:6px; cursor:pointer; font-family:inherit; }
        .services-lead { max-width:none; margin-top:7px; font-size:13.5px; color:var(--ink-soft); line-height:1.65; }
        .cara-frame { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:15px 30px 15px; margin-top:20px; }
        .cara-track { display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:100px auto 100px; column-gap:14px; position:relative; margin-top:0; }        .cara-track::before { content:""; position:absolute; top:100px; left:6%; right:6%; border-top:3px dotted var(--line); transform:translateY(35px); z-index:0; }
        .cara-cell-top, .cara-cell-bottom { display:flex; flex-direction:column; justify-content:flex-end; text-align:center; padding:0 6px; }
        .cara-cell-bottom { justify-content:flex-start; }
        .cara-cell-top h3, .cara-cell-bottom h3 { font-size:13.5px; font-weight:700; color:var(--sawah-deep); margin:0 0 4px; }
        .cara-cell-top p, .cara-cell-bottom p { font-size:11px; color:var(--ink-soft); line-height:1.5; margin:0; }
        .cara-circle-cell { display:flex; align-items:center; justify-content:center; position:relative; z-index:1; }
        .cara-circle { width:70px; height:70px; border-radius:50%; background:var(--sawah); color:var(--gold); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 0 rgba(0,0,0,.15); position:relative; }
        .cara-badge { position:absolute; bottom:-4px; right:-4px; background:var(--gold); color:#2A1D06; font-family:var(--font-fraunces),serif; font-weight:800; font-size:12px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #F4EFD9; }
        @media (max-width:820px){ .cara-track{ grid-template-columns:1fr; grid-template-rows:none; row-gap:22px; } .cara-track::before{ display:none; } .cara-cell-top, .cara-cell-bottom{ justify-content:center; } }
        .land-footer { text-align:center; font-size:11px; color:var(--ink-soft); padding-bottom:22px; }
      `}</style>

      <div className="nav">
        <div className="nav-logo"><div className="box"><Sprout size={17} /></div>Tanitera</div>
        <div className="nav-links">
          <a href="#tentang">Tentang</a>
          <a href="#kenapa">Kenapa</a>
          <a href="#cara-kerja">Cara Kerja</a>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="nav-cta" onClick={goDash}>Buka Dashboard <ArrowUpRight size={14} /></button>
        </div>
      </div>

      <div className="hero">
        <div className="hero-panel hero-main">
          <div>
            <div className="eyebrow">Program Makan Bergizi Gratis · SPPG Garut</div>
            <h1>Dari sawah ke dapur MBG, tanpa lewat <span className="accent">Jakarta</span></h1>
            <p>Tanitera menghubungkan dapur SPPG langsung dengan petani lokal lewat WhatsApp. Tanpa aplikasi baru, hanya pesan yang sudah biasa mereka pakai.</p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={goDash}>Buka Dashboard <ArrowUpRight size={15} /></button>
              <a href="#cara-kerja" className="btn btn-outline">Lihat cara kerja</a>
            </div>
          </div>
        </div>

        <div className="hero-panel hero-chat">
          <div className="wa-tag"><MessageCircle size={13} /> WhatsApp</div>
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

      <div className="about" id="tentang">
        <div>
          <div className="about-label">Masalah</div>
          <h2>Uang MBG <u>mengalir keluar</u> desa</h2>
        </div>
        <div>
          <div className="about-copy">
            <p>Dana MBG seharusnya menghidupkan ekonomi desa lewat pembelian bahan lokal. Tapi tanpa daftar petani yang jelas dan cara menggabungkan hasil panen kecil, SPPG lebih gampang pesan ke distributor besar di luar kota.</p>
            <p>Tanitera membalik alurnya: SPPG posting kebutuhan apa saja, petani balas lewat WhatsApp, AI merangking otomatis berdasarkan jarak, harga, dan keandalan.</p>
          </div>
        </div>
      </div>

      <div className="services" id="kenapa">
        <div className="services-head">
          <h2><Sparkles size={22} /> Why TaniTera?</h2>
        </div>
        <div className="flow-grid">
          <div className="flow-card">
            <div className="step-icon"><Smartphone size={17} /></div>
            <h3>Tanpa install app</h3>
            <p>Petani cukup balas WhatsApp yang sudah biasa mereka pakai, tanpa ada aplikasi baru untuk dipelajari.</p>
          </div>
          <div className="flow-card">
            <div className="step-icon"><Sparkles size={17} /></div>
            <h3>AI bisa baca bahasa santai</h3>
            <p>AI tetap mengerti jumlah dan harga yang ditawarkan petani dalam segala format.</p>
          </div>
          <div className="flow-card">
            <div className="step-icon"><Handshake size={17} /></div>
            <h3>SPPG urus logistik</h3>
            <p>Setelah dikonfirmasi, penjemputan akan diatur oleh SPPG. Sehingga, petani tidak perlu repot-repot mengantar bahan ke dapur.</p>
          </div>
        </div>
      </div>

      <div className="services" id="cara-kerja">
        <div className="services-head">
          <h2><Route size={22} /> Cara Kerja</h2>
          <button className="btn-pill-outline" onClick={goDash}>Coba Simulasi <ArrowUpRight size={13} /></button>
        </div>
        <p className="services-lead">Empat langkah dari kebutuhan SPPG sampai bahan siap dijemput dari petani lokal.</p>
        <div className="cara-frame">
          <div className="cara-track">
            <div className="cara-cell-top" />
            <div className="cara-cell-top"><h3>Petani balas via WhatsApp</h3><p>Tanpa install app baru dan cukup balas dengan bahasa sehari-hari.</p></div>
            <div className="cara-cell-top" />
            <div className="cara-cell-top"><h3>Konfirmasi & logistik</h3><p>SPPG konfirmasi satu klik dan akan langsung diatur penjemputan.</p></div>

            <div className="cara-circle-cell"><div className="cara-circle"><Send size={24} /><span className="cara-badge">1</span></div></div>
            <div className="cara-circle-cell"><div className="cara-circle"><Smartphone size={24} /><span className="cara-badge">2</span></div></div>
            <div className="cara-circle-cell"><div className="cara-circle"><Sparkles size={24} /><span className="cara-badge">3</span></div></div>
            <div className="cara-circle-cell"><div className="cara-circle"><Handshake size={24} /><span className="cara-badge">4</span></div></div>

            <div className="cara-cell-bottom"><h3>SPPG posting kebutuhan</h3><p>SPPG hanya input menu & jumlah bahan. Lalu, sistem kirim WhatsApp ke petani di sekitar dapur.</p></div>
            <div className="cara-cell-bottom" />
            <div className="cara-cell-bottom"><h3>AI proses & ranking</h3><p>Balasan diubah menjadi data terstruktur, lalu diranking otomatis.</p></div>
            <div className="cara-cell-bottom" />
          </div>
        </div>
      </div>

      <div className="land-footer">Tanitera - Menanam Harapan, Menuai Kesejahteraan</div>
    </div>
  );
}