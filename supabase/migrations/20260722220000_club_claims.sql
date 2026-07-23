-- Club ownership claims: lets a member request admin access to an existing
-- club, or propose a new one, subject to manual superadmin review.
create table club_claim_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid references clubs(id) on delete cascade,
  proposed_name text,
  proposed_city text,
  proposed_region text,
  proposed_country text default 'USA',
  contact_note text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  constraint claim_targets_one_thing check (
    (club_id is not null and proposed_name is null) or
    (club_id is null and proposed_name is not null)
  )
);

-- one pending claim per (user, club) at a time
create unique index one_pending_claim_per_user_club
  on club_claim_requests (user_id, club_id)
  where status = 'pending' and club_id is not null;

alter table club_claim_requests enable row level security;

create policy "users can view own claims" on club_claim_requests
  for select using (auth.uid() = user_id);

create policy "users can submit claims" on club_claim_requests
  for insert with check (auth.uid() = user_id);

-- no update/delete policy for regular users — approve/reject only happens
-- through the superadmin-gated API route using the service-role client
