-- Score tracking for all four games, plus caregiver-uploaded custom
-- media for the puzzle and tune-matching games. Kept independent of
-- the activities/activity_sessions/*_content tables (those model
-- caregiver-configured single-instance content with a heavier shape
-- than these simple, repeatable built-in games need).

create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  game_type text not null check (game_type in ('memory', 'brain_exercise', 'puzzle', 'rhythm')),
  score integer not null check (score >= 0 and score <= 100),
  metric jsonb,
  played_at timestamptz not null default now()
);

create index game_scores_patient_id_idx on public.game_scores (patient_id);
create index game_scores_played_at_idx on public.game_scores (played_at);

alter table public.game_scores enable row level security;

create policy "game_scores_all" on public.game_scores
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- ---------------------------------------------------------------------------
-- puzzle_images: caregiver-uploaded photos for the "Mind & Memory" puzzle.
-- ---------------------------------------------------------------------------
create table public.puzzle_images (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  image_url text not null,
  label text,
  created_at timestamptz not null default now()
);

create index puzzle_images_patient_id_idx on public.puzzle_images (patient_id);

alter table public.puzzle_images enable row level security;

create policy "puzzle_images_all" on public.puzzle_images
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- ---------------------------------------------------------------------------
-- rhythm_sounds: caregiver-uploaded audio clips for the "Tune Match" game.
-- Each row is one distinct sound; the game duplicates them into pairs,
-- the same way the Memory Game duplicates its built-in icon set.
-- ---------------------------------------------------------------------------
create table public.rhythm_sounds (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  audio_url text not null,
  label text,
  created_at timestamptz not null default now()
);

create index rhythm_sounds_patient_id_idx on public.rhythm_sounds (patient_id);

alter table public.rhythm_sounds enable row level security;

create policy "rhythm_sounds_all" on public.rhythm_sounds
  for all using (public.is_caregiver_for(patient_id))
  with check (public.is_caregiver_for(patient_id));

-- Both tables' files live in the existing private patient-media bucket,
-- under <patient_id>/puzzle/... and <patient_id>/rhythm/... — already
-- covered by that bucket's existing policies, which only key off the
-- first path segment.
