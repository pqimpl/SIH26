# Sudhi — Cognitive Care Companion

Sudhi is a cross-platform companion app for dementia patients and their caregivers, built for **Smart India Hackathon 2026**. It pairs a calm, accessible patient experience — familiar-photo puzzles, memory games, gentle daily routines — with a caregiver dashboard for configuring everything the patient sees, all backed by a real Supabase database with row-level security.

Full product and technical plan: [PLAN.md](PLAN.md).

<p align="center">
  <img src="design/1.png" width="180" alt="Splash screen" />
  <img src="design/5.png" width="180" alt="Patient home screen" />
  <img src="design/8.png" width="180" alt="Remember Me puzzle" />
  <img src="design/11.png" width="180" alt="Tune Match game" />
</p>

## What's built

**Caregiver account & patient profile**
- Email/password sign-up and sign-in (Supabase Auth), with email-confirmation support
- Caregiver profile: display name + photo, editable from a popup
- Patient profile: name + photo, created/edited from the same pattern — everything else in the app (greetings, routines, games, progress) is scoped to this one patient record

**Daily Routine**
- Caregiver adds/edits/removes routine items (icon, title, time-of-day)
- Patient checks items off with a small celebration animation on completion
- Completion is tracked per calendar day, so yesterday's checkmarks don't carry over

**Four games, all with real scoring**
| Game | How it works |
|---|---|
| **Memory Game** | Classic flip-and-match on a themed icon deck |
| **Brain Exercise** | Spot the next shape in a repeating pattern |
| **Mind & Memory** | Caregiver uploads a real photo; it's sliced into a tap-to-swap tile puzzle |
| **Tune Match** | Caregiver uploads their own sounds/tunes; the game turns them into an audio matching pair game, with a connecting line drawn between matched tiles. Sounds longer than 3 seconds can be trimmed to a 3-second window before adding |

Every game writes a normalized 0–100 score to the database on completion.

**Progress tab**
- Per-game and overall average scores, filterable by Week / Month / All Time
- A real "Best Streak" computed from actual daily routine completions
- A Good / Okay / Bad Progress assessment card

**Caregiver Corner** — a short static resource list (tips, guides) for caregivers.

**Sudhi — the voice assistant**
- The patient taps a microphone, speaks, and taps again. Sudhi answers out loud.
- Three-stage pipeline: **Sarvam Saaras** transcribes the speech, **Google Gemini** writes the reply, **Sarvam Bulbul** speaks it back
- Fully multilingual: the spoken language is auto-detected and the reply comes back in that same language, so a patient can speak Hindi, Tamil, Bengali or English without touching a setting
- Tapping the microphone again — even mid-reply — starts the next turn, so the conversation can continue as long as the patient wants
- Nothing is stored: the transcript lives in memory for the session and is discarded when the screen closes

## Tech stack

- **Client:** Expo SDK 54, React Native 0.81, TypeScript, Expo Router (file-based navigation)
- **Backend:** Supabase — Postgres, Auth, Storage, and an auto-generated REST API (PostgREST). There is no custom server.
- **Voice:** Sarvam AI (Saaras speech-to-text, Bulbul text-to-speech) and Google Gemini, called from the client — see [`src/lib/voice.ts`](app/src/lib/voice.ts)
- **Security:** Postgres Row Level Security on every table, scoped through a shared `is_caregiver_for(patient_id)` policy function; private storage buckets with time-limited signed URLs for photos and audio
- **Notable libraries:** `react-native-svg` (progress ring, Tune Match connector lines), `expo-audio` (sound playback), `expo-image-picker` / `expo-document-picker` (media selection), `@expo-google-fonts/playfair-display`

No API gateway, no custom backend framework, no ORM — the client talks to Supabase directly, and access control lives entirely in the database.

## Project structure

```
SIH26/
├── PLAN.md                  # full product & technical plan
├── design/                  # Figma exports referenced while building each screen
└── app/                     # the Expo app
    ├── src/app/              # Expo Router screens (file-based routes)
    │   ├── (tabs)/            # Home, Routine, Progress, Chat, Profile + the 4 games
    │   ├── auth.tsx           # sign-in / sign-up
    │   ├── onboarding.tsx
    │   └── caregiver-corner.tsx
    ├── src/components/       # shared UI + feature modals (patient/caregiver profile, routine, rhythm sounds)
    ├── src/state/            # data hooks (Supabase reads/writes) per feature
    ├── src/lib/              # Supabase client, typed schema, storage upload helpers
    └── supabase/migrations/  # every schema change, as plain SQL, in order
```

## Getting started

```bash
cd app
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npx expo start --web   # or --android / --ios via Expo Go
```

### Setting up the database

The schema lives entirely in [`app/supabase/migrations`](app/supabase/migrations), applied in filename order. Against a fresh Supabase project, paste each file's contents into the dashboard's **SQL Editor** and run it, oldest timestamp first:

1. `initial_schema` — the full data model (caregivers, patients, routines, activities, etc.) and its RLS policies
2. `caregiver_avatar_and_avatars_bucket` — caregiver profile pictures
3. `fix_patients_select_for_insert_returning` — an RLS fix (see below)
4. `game_scores_and_custom_media` — score tracking, caregiver-uploaded puzzle photos and Tune Match sounds
5. `rhythm_sound_trim` — the trim-offset column for Tune Match sounds

## Known limitations

- **The voice keys ship in the client bundle.** `EXPO_PUBLIC_*` variables are inlined into the JavaScript at build time, so anyone with the app can extract the Sarvam and Gemini keys. That is acceptable for a prototype with capped keys, but production should move the three calls behind a Supabase Edge Function so only the server holds them — which is also what PLAN.md's Social Mode describes.
- **Free-tier LLM quotas are small.** `gemini-3.6-flash` allows 20 requests per day on the free tier; the app defaults to `gemini-3.5-flash-lite`, which is faster and far more generous. Change `EXPO_PUBLIC_LLM_MODEL` if you have a paid key.
- **Recognition-question activity** (PLAN.md §5.2) was superseded by the two games actually shipped rather than being built in addition to them.
- **Migrations are applied by hand** through the Supabase dashboard rather than a linked CLI (`supabase db push`), since that requires an interactive browser login not available in every dev environment. Functionally identical, just a manual step.
- This is a hackathon prototype, not a medical device — it does not diagnose, treat, or replace professional care.
