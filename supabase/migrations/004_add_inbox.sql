create table if not exists inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  content text,
  image_url text,
  project_id uuid references goals(id) on delete set null,
  deliverable_id uuid references deliverables(id) on delete set null,
  created_at timestamptz default now()
);

alter table inbox enable row level security;

create policy "users own their inbox" on inbox
  for all using (auth.uid() = user_id);

-- Storage bucket for inbox images (run via Supabase dashboard or storage API)
-- bucket name: inbox-images, public: true
