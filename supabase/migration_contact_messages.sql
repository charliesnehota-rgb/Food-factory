-- Zprávy z kontaktních formulářů brandových webů
create table if not exists contact_messages (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text not null,
  message      text not null,
  concept_slug text,
  created_at   timestamptz not null default now()
);
alter table contact_messages enable row level security;
-- jen service_role (admin) čte; veřejnost nepíše přímo (jde přes API se service key)
create policy "admin reads contact" on contact_messages
  for select using (false);
