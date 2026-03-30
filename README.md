# Interleaved Click-Up Practice Tool

A guided practice app for musicians using the Interleaved Click-Up method.

## Deploying to Netlify (one-time setup)

1. Go to github.com and create a free account if you don't have one
2. Click the + icon → New repository → name it `icu-practice` → Create repository
3. Upload all these files by dragging them into the GitHub file area
4. Go to netlify.com → Add new site → Import from GitHub
5. Select your repo → Build command: `npm run build` → Publish directory: `dist`
6. Click Deploy — your app will be live at a netlify.app URL in ~2 minutes

## Supabase tables required

Run these in your Supabase SQL editor:

```sql
create table pieces (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  title text,
  composer text,
  instrument text,
  file_url text,
  file_type text,
  created_at timestamptz default now()
);

create table icu_sessions (
  id uuid default gen_random_uuid() primary key,
  piece_id uuid references pieces(id) on delete cascade,
  user_email text,
  title text,
  markers jsonb,
  start_tempo int,
  goal_tempo int,
  increment int,
  created_at timestamptz default now()
);

alter table pieces enable row level security;
alter table icu_sessions enable row level security;
create policy "open read" on pieces for select using (true);
create policy "open insert" on pieces for insert with check (true);
create policy "open read" on icu_sessions for select using (true);
create policy "open insert" on icu_sessions for insert with check (true);
```

Also create a public Storage bucket named `pieces` with open access policy.
