-- Tune Match plays at most a 3-second window of each uploaded sound.
-- There's no audio re-encoding available client-side (that would need a
-- native module incompatible with Expo Go), so we don't produce a shorter
-- file — we store where in the original file that window starts, and
-- playback seeks there and stops itself after 3 seconds.

alter table public.rhythm_sounds
  add column trim_start_seconds numeric not null default 0;
