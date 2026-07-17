alter table demands add column if not exists pax integer;

create table if not exists menus (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists menu_ingredients (
  id                uuid primary key default gen_random_uuid(),
  menu_id           uuid references menus(id) on delete cascade,
  name              text not null,
  unit              text not null default 'kg',
  qty_per_portion   numeric not null check (qty_per_portion > 0),
  distributor_price numeric not null check (distributor_price > 0),
  tag               text,
  sort_order        int not null default 0
);

alter table menus enable row level security;
alter table menu_ingredients enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'menus' and policyname = 'read all') then
    create policy "read all" on menus for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'menu_ingredients' and policyname = 'read all') then
    create policy "read all" on menu_ingredients for select using (true);
  end if;
end $$;

-- seed the 3 presets that used to live in lib/menus.js (skip if you already
-- have menus and don't want duplicates)
insert into menus (name) values
  ('Sop Ayam Sayuran'),
  ('Nasi Telur Balado + Tumis'),
  ('Ayam Goreng + Capcay')
on conflict do nothing;

insert into menu_ingredients (menu_id, name, unit, qty_per_portion, distributor_price, tag, sort_order)
select m.id, v.name, v.unit, v.qty_per_portion, v.distributor_price, v.tag, v.sort_order
from menus m
join (values
  ('Sop Ayam Sayuran',              'Ayam',        'kg',   0.06, 38000, 'Protein', 0),
  ('Sop Ayam Sayuran',              'Wortel',      'kg',   0.20, 12000, 'Umbi',    1),
  ('Sop Ayam Sayuran',              'Kentang',     'kg',   0.12, 14000, 'Umbi',    2),
  ('Sop Ayam Sayuran',              'Kol',         'kg',   0.08, 8000,  'Sayur',   3),
  ('Nasi Telur Balado + Tumis',     'Telur',       'kg',   0.09, 28000, 'Protein', 0),
  ('Nasi Telur Balado + Tumis',     'Cabai Merah', 'kg',   0.04, 42000, 'Bumbu',   1),
  ('Nasi Telur Balado + Tumis',     'Tomat',       'kg',   0.08, 15000, 'Sayur',   2),
  ('Nasi Telur Balado + Tumis',     'Bayam',       'ikat', 0.15, 3800,  'Sayur',   3),
  ('Ayam Goreng + Capcay',          'Ayam',        'kg',   0.07, 38000, 'Protein', 0),
  ('Ayam Goreng + Capcay',          'Wortel',      'kg',   0.10, 12000, 'Umbi',    1),
  ('Ayam Goreng + Capcay',          'Kol',         'kg',   0.09, 8000,  'Sayur',   2),
  ('Ayam Goreng + Capcay',          'Tomat',       'kg',   0.05, 15000, 'Sayur',   3)
) as v(menu_name, name, unit, qty_per_portion, distributor_price, tag, sort_order)
  on v.menu_name = m.name
where not exists (select 1 from menu_ingredients mi where mi.menu_id = m.id);