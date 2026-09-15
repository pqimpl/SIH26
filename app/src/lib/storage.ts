import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * On native, fetch() on a file://(or content://) URI is backed by React
 * Native's real HTTP networking stack, which fails outright on a local URI —
 * surfacing as a generic "Network request failed" even though no network is
 * involved. expo-file-system reads the bytes off disk instead there.
 *
 * On web the picked "file" is already just a blob: URL (in-memory, nothing
 * to read from disk), so fetch().blob() is the right — and only working —
 * approach; expo-file-system's File class isn't functional there.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  uri: string,
  contentType?: string | null
) {
  try {
    const body =
      Platform.OS === 'web' ? await (await fetch(uri)).blob() : await new File(uri).arrayBuffer();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, body, { contentType: contentType || 'application/octet-stream', upsert: true });
    return { error };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Could not read the selected file.') };
  }
}

export async function getSignedUrl(
  bucket: string,
  path: string | null,
  ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  return data?.signedUrl ?? null;
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
};

/**
 * Prefers the picked asset's mimeType, since a web file picker's blob: URI
 * carries no filename/extension at all — parsing the URI alone silently
 * produced the wrong extension (and wrong storage content-type) there.
 */
export function extensionFor(uri: string, mimeType?: string | null) {
  if (mimeType && EXTENSION_BY_MIME_TYPE[mimeType]) {
    return EXTENSION_BY_MIME_TYPE[mimeType];
  }
  const match = /\.([a-zA-Z0-9]+)$/.exec(uri.split('?')[0]);
  if (match) return match[1].toLowerCase();
  return mimeType?.split('/')[1] ?? 'bin';
}
