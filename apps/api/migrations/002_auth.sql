-- Phone sign-in: one users row per person, one ledger owner per row.
-- Sessions are opaque bearer tokens; only their hash is stored.

create table users (
  owner_id text primary key,
  phone text unique not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table auth_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_challenges_phone_idx on auth_challenges (phone, created_at desc);

create table sessions (
  token_hash text primary key,
  owner_id text not null references users (owner_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index sessions_owner_idx on sessions (owner_id);
