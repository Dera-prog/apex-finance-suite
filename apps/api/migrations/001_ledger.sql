-- Double-entry ledger: every balance in the product is a sum over postings.
-- Amounts are stored in minor units (kobo/cents) as bigint, never as floats.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  code text not null,
  name text not null,
  kind text not null check (kind in ('wallet', 'savings_plan', 'external')),
  currency char(3) not null,
  created_at timestamptz not null default now(),
  unique (owner_id, code)
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  reference text not null,
  title text not null,
  meta text not null default '',
  kind text not null check (kind in ('deposit', 'withdrawal', 'transfer', 'savings', 'invest', 'interest')),
  status text not null default 'Completed' check (status in ('Completed', 'Pending', 'Failed')),
  occurred_at timestamptz not null,
  primary_account uuid references accounts (id),
  amount_minor bigint,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, reference)
);

create index entries_timeline_idx on entries (owner_id, occurred_at desc);

create table postings (
  id bigint generated always as identity primary key,
  entry_id uuid not null references entries (id) on delete cascade,
  account_id uuid not null references accounts (id),
  currency char(3) not null,
  amount_minor bigint not null check (amount_minor <> 0)
);

create index postings_account_idx on postings (account_id);
create index postings_entry_idx on postings (entry_id);

create table plans (
  id text primary key,
  owner_id text not null,
  name text not null,
  kind text not null check (kind in ('flexible', 'fixed', 'target')),
  rate numeric(5, 2) not null,
  subtitle text not null,
  opened date not null,
  maturity date,
  target_minor bigint,
  monthly_minor bigint,
  color text not null,
  pastel text not null,
  icon text not null,
  sort_order smallint not null default 0
);

create table positions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  symbol text not null,
  currency char(3) not null,
  units bigint not null check (units >= 0),
  avg_cost_minor bigint not null check (avg_cost_minor >= 0),
  sort_order smallint not null default 0,
  unique (owner_id, symbol)
);

create table profiles (
  owner_id text primary key,
  account_kind text not null default 'seed' check (account_kind in ('seed', 'new')),
  name text not null,
  first_name text not null,
  initials text not null,
  phone text not null,
  email text not null,
  bvn text not null,
  nin text not null,
  kyc_level smallint not null check (kyc_level in (1, 2)),
  kyc_label text not null,
  address text not null,
  member_since text not null,
  bank_account text not null,
  us_stocks_account text not null,
  avatar_tint text not null
);

-- Balances are derived, never stored.
create view account_balances as
select
  a.id as account_id,
  a.owner_id,
  a.code,
  a.kind,
  a.currency,
  coalesce(sum(p.amount_minor), 0)::bigint as balance_minor
from accounts a
left join postings p on p.account_id = a.id
group by a.id, a.owner_id, a.code, a.kind, a.currency;

-- The only supported way to write: an entry plus postings that net to zero per currency.
-- A failed attempt carries an amount but no postings, because no money moved.
create function post_entry(
  p_owner_id text,
  p_reference text,
  p_title text,
  p_meta text,
  p_kind text,
  p_status text,
  p_occurred_at timestamptz,
  p_primary text,
  p_postings jsonb,
  p_visible boolean default true,
  p_amount_minor bigint default null
) returns uuid
language plpgsql
as $$
declare
  v_entry uuid;
  v_bad text;
  v_count integer := jsonb_array_length(p_postings);
begin
  if v_count = 0 and p_amount_minor is null then
    raise exception 'post_entry_requires_postings_or_amount';
  end if;

  if v_count > 0 and v_count < 2 then
    raise exception 'post_entry_requires_two_postings';
  end if;

  select string_agg(t.currency || '=' || t.total, ', ')
    into v_bad
  from (
    select
      x ->> 'currency' as currency,
      sum((x ->> 'amountMinor')::bigint) as total
    from jsonb_array_elements(p_postings) as x
    group by 1
    having sum((x ->> 'amountMinor')::bigint) <> 0
  ) as t;

  if v_bad is not null then
    raise exception 'post_entry_unbalanced: %', v_bad;
  end if;

  select string_agg(x ->> 'account', ', ')
    into v_bad
  from jsonb_array_elements(p_postings) as x
  where not exists (
    select 1
    from accounts a
    where a.owner_id = p_owner_id
      and a.code = x ->> 'account'
      and a.currency = x ->> 'currency'
  );

  if v_bad is not null then
    raise exception 'post_entry_unknown_account: %', v_bad;
  end if;

  insert into entries (owner_id, reference, title, meta, kind, status, occurred_at, primary_account, visible)
  values (
    p_owner_id,
    p_reference,
    p_title,
    coalesce(p_meta, ''),
    p_kind,
    coalesce(p_status, 'Completed'),
    p_occurred_at,
    (select id from accounts where owner_id = p_owner_id and code = p_primary),
    coalesce(p_visible, true)
  )
  returning id into v_entry;

  insert into postings (entry_id, account_id, currency, amount_minor)
  select v_entry, a.id, x ->> 'currency', (x ->> 'amountMinor')::bigint
  from jsonb_array_elements(p_postings) as x
  join accounts a on a.owner_id = p_owner_id and a.code = x ->> 'account';

  update entries e
     set amount_minor = coalesce(
       p_amount_minor,
       (select p.amount_minor from postings p where p.entry_id = e.id and p.account_id = e.primary_account)
     )
   where e.id = v_entry;

  return v_entry;
end;
$$;

-- Postings are append-only: corrections are new entries, not edits.
create function reject_posting_mutation() returns trigger
language plpgsql
as $$
begin
  raise exception 'postings_are_append_only';
end;
$$;

create trigger postings_no_update before update on postings
for each row execute function reject_posting_mutation();

create trigger postings_no_delete before delete on postings
for each row execute function reject_posting_mutation();
