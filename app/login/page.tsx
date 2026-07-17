"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, Lock } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const expected = process.env.NEXT_PUBLIC_DEMO_PIN || "";

  const submit = () => {
    if (!expected || pin === expected) {
      try { localStorage.setItem("tsppg_unlocked", "1"); } catch {}
      router.push("/dashboard");
    } else {
      setErr(true);
    }
  };

  return (
    <div className="tsppg-root">
      <div style={{ minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14,
          padding: "28px 26px", width: 340, textAlign: "center",
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 10, background: "var(--sawah)", color: "var(--gold)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
          }}><Sprout size={22} /></div>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: "var(--sawah-deep)" }}>Dashboard SPPG</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 18px" }}>
            Masukkan PIN akses SPPG Garut Pusat
          </p>
          <input
            className="field-input mono"
            style={{ textAlign: "center", fontSize: 18, letterSpacing: ".3em" }}
            type="password" inputMode="numeric" placeholder="••••"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {err && <p style={{ fontSize: 11.5, color: "var(--clay)", fontWeight: 700, margin: "8px 0 0" }}>PIN salah</p>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={submit}>
            <Lock size={14} /> Masuk
          </button>
        </div>
      </div>
    </div>
  );
}