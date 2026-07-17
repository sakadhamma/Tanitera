import { GoogleGenerativeAI } from "@google/generative-ai";
                   
export type ParsedItem = {
  commodity: string | null;
  qty: number;
  price_per_unit: number;
};
export type ParsedReply = {
  intent: "offer" | "decline" | "question" | "unclear";
  items: ParsedItem[];
  confidence: number;
};

const SYSTEM_PROMPT = `Kamu adalah parser untuk platform TaniSPPG. Ubah balasan WhatsApp petani menjadi JSON terstruktur.

Konteks: petani menerima pesan berisi DAFTAR kebutuhan SPPG (bisa lebih dari satu bahan), contoh:
"SPPG Garut butuh minggu depan: 200kg wortel, 80kg tomat. Balas dengan stok Anda."
Balasan sering berisi typo, singkatan, atau bahasa Sunda, dan bisa menawarkan BEBERAPA bahan sekaligus.

KELUARKAN HANYA JSON VALID tanpa markdown. Skema:
{"intent":"offer"|"decline"|"question"|"unclear","items":[{"commodity":string|null,"qty":number,"price_per_unit":number}],"confidence":number}

Aturan:
- Satu item per bahan yang ditawarkan. Bahan tidak disebut → commodity null (hanya boleh kalau cuma ada 1 item).
- "9rb","9 ribu","9000","9k" = 9000
- "1,5 kuintal"/"kwintal" = 150 kg. "1 ton" = 1000. "50 kilo" = 50.
- Harga < 100 tanpa satuan → asumsikan ribuan, confidence maks 0.6
- Total harga bukan per satuan (contoh "80kg 720rb") → hitung per satuan, confidence maks 0.7
- "gak ada","kosong","belum panen","teu aya","teu tiasa" → decline, items []
- Pertanyaan ("kapan diambil?","bayarnya gimana?") → question, items []
- Offer tanpa qty ATAU harga yang jelas → unclear, items []
- JANGAN menebak angka yang tidak ada di pesan.

Contoh:
"YA 80 9000" → {"intent":"offer","items":[{"commodity":null,"qty":80,"price_per_unit":9000}],"confidence":0.9}
"punya wortel 80kg pak harga 9rb" → {"intent":"offer","items":[{"commodity":"wortel","qty":80,"price_per_unit":9000}],"confidence":0.95}
"wortel 80kg 9rb, tomat 50kg 12rb" → {"intent":"offer","items":[{"commodity":"wortel","qty":80,"price_per_unit":9000},{"commodity":"tomat","qty":50,"price_per_unit":12000}],"confidence":0.95}
"ada cabe 20 kilo 40rb, kalo bayam 100 ikat 3rb aja" → {"intent":"offer","items":[{"commodity":"cabe","qty":20,"price_per_unit":40000},{"commodity":"bayam","qty":100,"price_per_unit":3000}],"confidence":0.92}
"wortel ada 1,5 kwintal 8500. tomat kosong pak" → {"intent":"offer","items":[{"commodity":"wortel","qty":150,"price_per_unit":8500}],"confidence":0.9}
"punten teu aya stok ayeuna" → {"intent":"decline","items":[],"confidence":0.9}
"ini diambil kapan pak?" → {"intent":"question","items":[],"confidence":0.95}
"ada sih lumayan" → {"intent":"unclear","items":[],"confidence":0.3}`;

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function parseFarmerReply(message: string): Promise<ParsedReply> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      });
      const result = await model.generateContent(message);
      const parsed = JSON.parse(result.response.text());
      if (isValid(parsed)) return parsed;
    } catch (err) {
      console.error("Gemini parse failed, falling back to regex:", err);
    }
  }
  return regexFallback(message);
}

function isValid(p: any): p is ParsedReply {
  return (
    p &&
    ["offer", "decline", "question", "unclear"].includes(p.intent) &&
    Array.isArray(p.items) &&
    p.items.every(
      (it: any) =>
        (it.commodity === null || typeof it.commodity === "string") &&
        typeof it.qty === "number" && typeof it.price_per_unit === "number"
    ) &&
    typeof p.confidence === "number"
  );
}

// safety net
function regexFallback(msg: string): ParsedReply {
  const m = msg.toLowerCase().replace(/,(?=\d)/g, ".");
  if (/\b(gak ada|ga ada|kosong|belum panen|teu aya|teu tiasa|tidak)\b/.test(m) && !/\d/.test(m))
    return { intent: "decline", items: [], confidence: 0.7 };
  if (/\?\s*$/.test(m) || /\b(kapan|gimana|bagaimana|dimana)\b/.test(m))
    return { intent: "question", items: [], confidence: 0.6 };

  const items: ParsedItem[] = [];
  for (const seg of m.split(/[,.;\n]+/)) {
    const qty = seg.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|ikat|buah)\b/);
    if (!qty) continue;
    const shorthand = seg.match(/(\d+(?:\.\d+)?)\s*(rb|ribu|k\b)/);
    let priceVal: number | null = null;
    if (shorthand) {
      priceVal = parseFloat(shorthand[1]) * 1000;
    } else {
      const nums = [...seg.matchAll(/\b(\d{3,6})\b/g)].map((x) => x[1]);
      const cand = nums.find((n) => n !== qty[1]);
      if (cand) priceVal = parseFloat(cand);
    }
    if (priceVal === null) continue;
    const word = seg.match(/\b([a-z]{4,})\b/); // first word ≥4 letters as commodity hint
    items.push({ commodity: word ? word[1] : null, qty: parseFloat(qty[1]), price_per_unit: priceVal });
  }
  if (items.length) return { intent: "offer", items, confidence: 0.5 };

  const bare = m.match(/\bya\b\s+(\d+)\s+(\d+)/);
  if (bare)
    return { intent: "offer", items: [{ commodity: null, qty: +bare[1], price_per_unit: +bare[2] }], confidence: 0.6 };

  return { intent: "unclear", items: [], confidence: 0.2 };
}