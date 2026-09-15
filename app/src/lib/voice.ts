import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Voice pipeline: speech -> text -> LLM -> speech.
 *
 * A TypeScript port of concept/voice_assistant.py. Same three legs, same
 * providers: Sarvam Saaras for STT, Gemini for the reply, Sarvam Bulbul for
 * TTS. The language is auto-detected from the patient's speech and the reply
 * is spoken back in that same language, so a patient can switch between
 * Hindi, Tamil, English and so on mid-conversation without touching a setting.
 *
 * Nothing here is persisted — the transcript lives in component state for the
 * length of the session and is dropped when the screen unmounts.
 */

const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const SARVAM_STT_MODEL = 'saaras:v3';
const SARVAM_TTS_MODEL = 'bulbul:v3';
const SARVAM_SPEAKER = 'priya';

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY ?? '';
const LLM_API_KEY = process.env.EXPO_PUBLIC_LLM_API_KEY ?? '';
const LLM_API_URL =
  process.env.EXPO_PUBLIC_LLM_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta/models';
const LLM_MODEL = process.env.EXPO_PUBLIC_LLM_MODEL ?? 'gemini-3.5-flash-lite';

/**
 * `thinkingLevel` is a Gemini 3.x generation config; 2.x models reject it with
 * a 400, so only send it where it is understood.
 */
const SUPPORTS_THINKING_LEVEL = LLM_MODEL.startsWith('gemini-3');

/**
 * Languages Sarvam's TTS can speak. STT auto-detection can return a code
 * outside this set, in which case we fall back to Indian English rather than
 * failing the whole exchange.
 */
const TTS_LANGUAGES = new Set([
  'en-IN',
  'hi-IN',
  'bn-IN',
  'ta-IN',
  'te-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'gu-IN',
  'pa-IN',
  'od-IN',
  'as-IN',
  'brx-IN',
  'mni-IN',
]);

const FALLBACK_LANGUAGE = 'en-IN';

export const SUDHI_SYSTEM_PROMPT = [
  'You are Sudhi, a warm, patient companion for an older adult who may be living with dementia.',
  'Reply in the same language the user spoke in.',
  'Keep replies to one or two short, simple sentences.',
  'Be calm and reassuring. Never correct or contradict them harshly, never quiz them, and never rush them.',
  'If they seem confused or distressed, gently reassure them and suggest they talk to their caregiver.',
  'You are a friendly companion, not a doctor — never give medical advice or diagnoses.',
].join(' ');

export type VoiceTurn = {
  id: string;
  role: 'patient' | 'sudhi';
  text: string;
};

export type VoiceExchange = {
  transcript: string;
  languageCode: string;
  replyText: string;
  replyAudioUri: string;
};

export class VoiceError extends Error {
  readonly stage: 'stt' | 'llm' | 'tts' | 'config';

  constructor(stage: VoiceError['stage'], message: string) {
    super(message);
    this.stage = stage;
    this.name = 'VoiceError';
  }
}

export function missingVoiceKeys(): string[] {
  const missing: string[] = [];
  if (!SARVAM_API_KEY) missing.push('EXPO_PUBLIC_SARVAM_API_KEY');
  if (!LLM_API_KEY) missing.push('EXPO_PUBLIC_LLM_API_KEY');
  return missing;
}

/**
 * Upstream overload — worth another try. Deliberately excludes 429: a
 * per-minute quota cannot clear in the second or two we would wait, so
 * retrying it just burns more of the allowance.
 */
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST with retries for transient trouble — the same reason the Python script
 * retries, plus overloaded-provider responses. Patients are often on slow
 * connections and these models do return the occasional 503; a single blip
 * shouldn't end the conversation.
 */
async function postWithRetry(
  url: string,
  init: RequestInit,
  { timeoutMs = 30000, retries = 2 }: { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await wait(600 * attempt);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, method: 'POST', signal: controller.signal });
      if (!RETRYABLE_STATUSES.has(response.status)) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

/**
 * Sarvam validates the declared content type against a fixed allow-list, and
 * `audio/m4a` — the obvious label for what the native recorder produces — is
 * *not* on it. `audio/mp4` is, and describes the same container.
 */
function mimeTypeFor(uri: string): string {
  if (uri.includes('.webm')) return 'audio/webm';
  if (uri.includes('.wav')) return 'audio/wav';
  return 'audio/mp4';
}

function fileNameFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'speech.webm';
  if (mimeType.includes('wav')) return 'speech.wav';
  return 'speech.m4a';
}

/**
 * Step 1 — Sarvam speech-to-text. `language_code: "unknown"` asks Sarvam to
 * auto-detect, and we keep the detected code so the reply can be spoken back
 * in the same language.
 */
export async function speechToText(
  recordingUri: string
): Promise<{ transcript: string; languageCode: string }> {
  const mimeType = mimeTypeFor(recordingUri);
  const fileName = fileNameFor(mimeType);

  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web the recorder hands back a blob: URL, which fetch can read.
    const blob = await (await fetch(recordingUri)).blob();
    form.append('file', blob, fileName);
  } else {
    // On native, fetch() cannot read a local file:// URI, but React Native's
    // multipart encoder reads the file itself when given this shape.
    form.append('file', { uri: recordingUri, name: fileName, type: mimeType } as unknown as Blob);
  }
  form.append('model', SARVAM_STT_MODEL);
  form.append('language_code', 'unknown');
  form.append('mode', 'transcribe');

  // Content-Type is deliberately unset so the runtime adds the multipart boundary.
  const response = await postWithRetry(
    `${SARVAM_BASE_URL}/speech-to-text`,
    { headers: { 'api-subscription-key': SARVAM_API_KEY }, body: form },
    { timeoutMs: 30000 }
  );

  if (!response.ok) {
    console.warn('[voice] STT failed', response.status, await response.text());
    throw new VoiceError('stt', "I couldn't quite hear that. Let's try once more.");
  }

  const result = (await response.json()) as { transcript?: string; language_code?: string };
  return {
    transcript: (result.transcript ?? '').trim(),
    languageCode: result.language_code || FALLBACK_LANGUAGE,
  };
}

/**
 * Step 2 — Gemini. Prior turns are passed as conversation context so replies
 * follow on naturally, but they only ever live in memory.
 */
export async function callLlm(userText: string, history: VoiceTurn[] = []): Promise<string> {
  if (!LLM_API_KEY) {
    throw new VoiceError('config', 'The assistant is not configured yet.');
  }

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === 'patient' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    })),
    { role: 'user', parts: [{ text: userText }] },
  ];

  const response = await postWithRetry(
    `${LLM_API_URL}/${LLM_MODEL}:generateContent`,
    {
      // This key format authenticates via header, not a ?key= query param.
      headers: { 'content-type': 'application/json', 'x-goog-api-key': LLM_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SUDHI_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 300,
          // Lowest-latency thinking mode: without this, internal reasoning
          // consumes most of the output budget and the reply comes back empty.
          ...(SUPPORTS_THINKING_LEVEL
            ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } }
            : { thinkingConfig: { thinkingBudget: 0 } }),
        },
      }),
    },
    { timeoutMs: 45000 }
  );

  if (!response.ok) {
    console.warn('[voice] LLM failed', response.status, await response.text());
    throw new VoiceError(
      'llm',
      response.status === 429
        ? 'I need a short rest. Please try again in a minute.'
        : 'I am having trouble thinking right now. Please try again.'
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // Skip internal "thinking" parts — only the spoken answer should be read out.
  return parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join('')
    .trim();
}

/**
 * Step 3 — Sarvam text-to-speech, returning base64 WAV bytes.
 */
export async function textToSpeech(text: string, languageCode: string): Promise<string> {
  const target = TTS_LANGUAGES.has(languageCode) ? languageCode : FALLBACK_LANGUAGE;

  const response = await postWithRetry(
    `${SARVAM_BASE_URL}/text-to-speech`,
    {
      headers: { 'api-subscription-key': SARVAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_language_code: target,
        speaker: SARVAM_SPEAKER,
        model: SARVAM_TTS_MODEL,
      }),
    },
    { timeoutMs: 30000 }
  );

  if (!response.ok) {
    console.warn('[voice] TTS failed', response.status, await response.text());
    throw new VoiceError('tts', 'I could not say that out loud. Please try again.');
  }

  const data = (await response.json()) as { audios?: string[] };
  const audio = data.audios?.[0];
  if (!audio) {
    throw new VoiceError('tts', 'I could not say that out loud. Please try again.');
  }
  return audio;
}

const REPLY_DIRECTORY = 'sudhi-voice';

/**
 * Turns base64 WAV bytes into something the audio player can load: a data URI
 * on web, a real cache file on native (where large data URIs are unreliable).
 */
export function saveReplyAudio(base64: string): string {
  if (Platform.OS === 'web') {
    return `data:audio/wav;base64,${base64}`;
  }
  const directory = new Directory(Paths.cache, REPLY_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true });
  const file = new File(directory, `reply-${Date.now()}.wav`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Clears cached reply audio. Called when the voice screen unmounts. */
export function clearReplyAudio(): void {
  if (Platform.OS === 'web') return;
  try {
    const directory = new Directory(Paths.cache, REPLY_DIRECTORY);
    if (directory.exists) directory.delete();
  } catch {
    // Best-effort cleanup — the OS clears the cache directory anyway.
  }
}

/** End to end: recording in, spoken reply out. */
export async function runVoicePipeline(
  recordingUri: string,
  history: VoiceTurn[] = []
): Promise<VoiceExchange> {
  const { transcript, languageCode } = await speechToText(recordingUri);
  if (!transcript) {
    throw new VoiceError('stt', "I didn't catch that. Could you try again?");
  }

  const replyText = await callLlm(transcript, history);
  if (!replyText) {
    throw new VoiceError('llm', 'I am having trouble thinking right now. Please try again.');
  }

  const replyAudioUri = saveReplyAudio(await textToSpeech(replyText, languageCode));
  return { transcript, languageCode, replyText, replyAudioUri };
}
