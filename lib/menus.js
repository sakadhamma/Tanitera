// backup if supabase fails
export const MENU_PRESETS = [
  {
    id: "sop-ayam",
    name: "Sop Ayam Sayuran",
    ingredients: [
      { name: "Ayam",        unit: "kg",   qtyPerPortion: 0.06, distributorPrice: 38000, tag: "Protein" },
      { name: "Wortel",      unit: "kg",   qtyPerPortion: 0.20, distributorPrice: 12000, tag: "Umbi" },
      { name: "Kentang",     unit: "kg",   qtyPerPortion: 0.12, distributorPrice: 14000, tag: "Umbi" },
      { name: "Kol",         unit: "kg",   qtyPerPortion: 0.08, distributorPrice: 8000,  tag: "Sayur" },
    ],
  },
  {
    id: "nasi-telur",
    name: "Nasi Telur Balado + Tumis",
    ingredients: [
      { name: "Telur",       unit: "kg",   qtyPerPortion: 0.09, distributorPrice: 28000, tag: "Protein" },
      { name: "Cabai Merah", unit: "kg",   qtyPerPortion: 0.04, distributorPrice: 42000, tag: "Bumbu" },
      { name: "Tomat",       unit: "kg",   qtyPerPortion: 0.08, distributorPrice: 15000, tag: "Sayur" },
      { name: "Bayam",       unit: "ikat", qtyPerPortion: 0.15, distributorPrice: 3800,  tag: "Sayur" },
    ],
  },
  {
    id: "ayam-goreng",
    name: "Ayam Goreng + Capcay",
    ingredients: [
      { name: "Ayam",        unit: "kg",   qtyPerPortion: 0.07, distributorPrice: 38000, tag: "Protein" },
      { name: "Wortel",      unit: "kg",   qtyPerPortion: 0.10, distributorPrice: 12000, tag: "Umbi" },
      { name: "Kol",         unit: "kg",   qtyPerPortion: 0.09, distributorPrice: 8000,  tag: "Sayur" },
      { name: "Tomat",       unit: "kg",   qtyPerPortion: 0.05, distributorPrice: 15000, tag: "Sayur" },
    ],
  },
];

// dropdown choices
export const PAX_PRESETS = [50, 100, 250, 500, 1000];