-- Request throttling that works on serverless: every instance shares the database.

create table rate_limits (
  bucket text not null,
  subject text not null,
  occurred_at timestamptz not null default now()
);

create index rate_limits_lookup_idx on rate_limits (bucket, subject, occurred_at desc);
create index rate_limits_expiry_idx on rate_limits (occurred_at);
