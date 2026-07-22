-- Jack Off Clubs Passport — initial schema

create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  region text not null,
  country text not null default 'USA',
  logo_url text,
  avg_rating numeric(2,1) default 0,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  home_club_id uuid references clubs(id),
  tier text default 'Bronze' check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum')),
  bio text,
  city text,
  created_at timestamptz default now()
);

create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  code text unique not null,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  qr_code_id uuid references qr_codes(id),
  checked_in_at timestamptz default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  check_in_id uuid references check_ins(id),
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now(),
  unique (user_id, club_id)
);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_type text not null,
  earned_at timestamptz default now(),
  unique (user_id, achievement_type)
);

create table user_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  total_checkins int default 0,
  unique_clubs int default 0,
  unique_regions int default 0,
  total_reviews int default 0
);

-- club owners/admins, checked by admin API routes
create table club_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, club_id)
);

-- auto-create profile + stats row when someone signs up via Supabase Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email);
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- public leaderboard view (runs as the view owner, so it can read across all profiles)
create view leaderboard as
  select p.id as user_id, p.display_name, p.tier, p.home_club_id, coalesce(us.unique_clubs, 0) as unique_clubs
  from profiles p
  left join user_stats us on us.user_id = p.id
  order by unique_clubs desc;

grant select on leaderboard to anon, authenticated;

-- Row level security
alter table clubs enable row level security;
create policy "clubs are publicly readable" on clubs for select using (true);

alter table profiles enable row level security;
create policy "users can view own profile" on profiles for select using (auth.uid() = id);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

alter table qr_codes enable row level security;
-- no anon/authenticated policies: only the server (service role) reads/writes QR codes

alter table check_ins enable row level security;
create policy "users can view own checkins" on check_ins for select using (auth.uid() = user_id);
-- inserts go through the /api/checkin route using the service role, so the
-- achievement engine and check-in row stay consistent in one transaction

alter table reviews enable row level security;
create policy "reviews are publicly readable" on reviews for select using (true);
create policy "users can insert own reviews" on reviews for insert with check (auth.uid() = user_id);
create policy "users can update own reviews" on reviews for update using (auth.uid() = user_id);

alter table achievements enable row level security;
create policy "users can view own achievements" on achievements for select using (auth.uid() = user_id);

alter table user_stats enable row level security;
create policy "users can view own stats" on user_stats for select using (auth.uid() = user_id);

alter table club_admins enable row level security;
create policy "admins can view own admin rows" on club_admins for select using (auth.uid() = user_id);
