-- Push subscriptions pro Web Push notifikace
create table if not exists push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_user_idx on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
create policy "own subs manage" on push_subscriptions
  for all using (auth.uid() = user_id);
