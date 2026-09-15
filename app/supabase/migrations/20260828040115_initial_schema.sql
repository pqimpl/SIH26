-- Sudhi initial schema
-- Tables per PLAN.md section 7, with RLS scoping every patient-related row
-- to the caregivers who have been granted access to that patient.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- caregivers (1:1 with an auth.users row)
-- ---------------------------------------------------------------------------
create table public.caregivers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger caregivers_set_updated_at
  before update on public.caregivers
  for each row execute function public.set_updated_at();

-- Automatically create a caregiver row when someone signs up.
create or replace function public.handle_new_caregiver()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.caregivers (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_caregiver();

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.caregivers (id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- patient_caregiver_access (many-to-many)
-- ---------------------------------------------------------------------------
create table public.patient_caregiver_access (
  patient_id uuid not null references public.patients (id) on delete cascade,
  caregiver_id uuid not null references public.caregivers (id) on delete cascade,
  role text not null default 'caregiver' check (role in ('owner', 'caregiver')),
  created_at timestamptz not null default now(),
  primary key (patient_id, caregiver_id)
);

-- Grant the creating caregiver 'owner' access automatically.
create or replace function public.handle_new_patient()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.patient_caregiver_access (patient_id, caregiver_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_patient_created
  after insert on public.patients
  for each row execute function public.handle_new_patient();

-- Helper used by every RLS policy below.
create or replace function public.is_caregiver_for(target_patient_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.patient_caregiver_access
    where patient_id = target_patient_id
      and caregiver_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- activities (shared parent row for puzzle / question / rhythm instances)
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  activity_type text not null check (activity_type in ('puzzle', 'question', 'rhythm')),
  title text not null,
  description text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  enabled boolean not null default true,
  schedule jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_patient_id_idx on public.activities (patient_id);

create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- puzzle_content
-- ---------------------------------------------------------------------------
create table public.puzzle_content (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  image_url text not null,
  piece_count integer not null default 4 check (piece_count in (4, 6, 9))
);

-- ---------------------------------------------------------------------------
-- question_content (recognition questions)
-- ---------------------------------------------------------------------------
create table public.question_content (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  image_url text not null,
  prompt text not null,
  choices jsonb not null,
  correct_choice_index integer not null,
  explanation text
);

-- ---------------------------------------------------------------------------
-- rhythm_content
-- ---------------------------------------------------------------------------
create table public.rhythm_content (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  audio_url text not null,
  tempo_bpm integer
);

-- ---------------------------------------------------------------------------
-- routine_items (daily to-do activities, module 5.3)
-- ---------------------------------------------------------------------------
create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null,
  icon text,
  scheduled_time time,
  repeat_days smallint[] not null default '{0,1,2,3,4,5,6}',
  requires_confirmation boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routine_items_patient_id_idx on public.routine_items (patient_id);

create trigger routine_items_set_updated_at
  before update on public.routine_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_sessions (a single play-through of an activity)
-- ---------------------------------------------------------------------------
create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now()
);

create index activity_sessions_patient_id_idx on public.activity_sessions (patient_id);
create index activity_sessions_activity_id_idx on public.activity_sessions (activity_id);

-- ---------------------------------------------------------------------------
-- daily_completions (one row per routine item per calendar day)
-- ---------------------------------------------------------------------------
create table public.daily_completions (
  routine_item_id uuid not null references public.routine_items (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  completed_date date not null,
  completed_at timestamptz not null default now(),
  primary key (routine_item_id, completed_date)
);

create index daily_completions_patient_id_idx on public.daily_completions (patient_id);

-- ---------------------------------------------------------------------------
-- conversation_settings (AI Social Mode, module 5.5 — 1:1 with patient)
-- ---------------------------------------------------------------------------
create table public.conversation_settings (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  enabled boolean not null default true,
  theme text,
  context jsonb,
  history_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger conversation_settings_set_updated_at
  before update on public.conversation_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.caregivers enable row level security;
alter table public.patients enable row level security;
alter table public.patient_caregiver_access enable row level security;
alter table public.activities enable row level security;
alter table public.puzzle_content enable row level security;
alter table public.question_content enable row level security;
alter table public.rhythm_content enable row level security;
alter table public.routine_items enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.daily_completions enable row level security;
alter table public.conversation_settings enable row level security;

-- caregivers: a caregiver can only read/update their own row.
create policy "caregivers_select_self" on public.caregivers
  for select using (id = auth.uid());
create policy "caregivers_update_self" on public.caregivers
  for update using (id = auth.uid());

-- patients: visible/editable only to caregivers with access.
create policy "patients_select" on public.patients
  for select using (public.is_caregiver_for(id));
create policy "patients_insert" on public.patients
  for insert with check (created_by = auth.uid());
create policy "patients_update" on public.patients
  for update using (public.is_caregiver_for(id));
create policy "patients_delete" on public.patients
  for delete using (public.is_caregiver_for(id));

-- patient_caregiver_access: a caregiver can see grants for patients they
-- already have access to (so they can see other caregivers on the same
-- patient), and only an existing caregiver can add another one.
create policy "access_select" on public.patient_caregiver_access
  for select using (public.is_caregiver_for(patient_id));
create policy "access_insert" on public.patient_caregiver_access
  for insert with check (public.is_caregiver_for(patient_id));
create policy "access_delete" on public.patient_caregiver_access
  for delete using (public.is_caregiver_for(patient_id));

-- activities
create policy "activities_all" on public.activities
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- puzzle_content / question_content / rhythm_content: scoped via their
-- parent activity's patient_id.
create policy "puzzle_content_all" on public.puzzle_content
  for all using (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  )
  with check (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  );

create policy "question_content_all" on public.question_content
  for all using (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  )
  with check (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  );

create policy "rhythm_content_all" on public.rhythm_content
  for all using (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  )
  with check (
    public.is_caregiver_for((select patient_id from public.activities where id = activity_id))
  );

-- routine_items
create policy "routine_items_all" on public.routine_items
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- activity_sessions
create policy "activity_sessions_all" on public.activity_sessions
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- daily_completions
create policy "daily_completions_all" on public.daily_completions
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- conversation_settings
create policy "conversation_settings_all" on public.conversation_settings
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for patient images/audio, path convention
-- "<patient_id>/<file>". Access follows the same caregiver-grant check.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('patient-media', 'patient-media', false)
on conflict (id) do nothing;

create policy "patient_media_select" on storage.objects
  for select using (
    bucket_id = 'patient-media'
    and public.is_caregiver_for((storage.foldername(name))[1]::uuid)
  );

create policy "patient_media_insert" on storage.objects
  for insert with check (
    bucket_id = 'patient-media'
    and public.is_caregiver_for((storage.foldername(name))[1]::uuid)
  );

create policy "patient_media_update" on storage.objects
  for update using (
    bucket_id = 'patient-media'
    and public.is_caregiver_for((storage.foldername(name))[1]::uuid)
  );

create policy "patient_media_delete" on storage.objects
  for delete using (
    bucket_id = 'patient-media'
    and public.is_caregiver_for((storage.foldername(name))[1]::uuid)
  );
