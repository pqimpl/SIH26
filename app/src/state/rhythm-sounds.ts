import { useCallback, useEffect, useState } from 'react';

import { extensionFor, getSignedUrl, uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export type RhythmSound = {
  id: string;
  label: string;
  audioUrl: string;
  trimStart: number;
};

type SaveResult = { error: string | null };

export function useRhythmSounds(patientId: string | null) {
  const [sounds, setSounds] = useState<RhythmSound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setSounds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('rhythm_sounds')
      .select('id, label, audio_url, trim_start_seconds')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true });

    const withUrls = await Promise.all(
      (data ?? []).map(async (row) => ({
        id: row.id,
        label: row.label ?? 'Sound',
        audioUrl: await getSignedUrl('patient-media', row.audio_url),
        trimStart: row.trim_start_seconds,
      }))
    );
    setSounds(withUrls.filter((sound): sound is RhythmSound => Boolean(sound.audioUrl)));
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSound = async (
    uri: string,
    label: string,
    mimeType?: string | null,
    trimStart = 0
  ): Promise<SaveResult> => {
    if (!patientId) return { error: 'No patient selected.' };
    const path = `${patientId}/rhythm/${Date.now()}.${extensionFor(uri, mimeType)}`;
    const { error } = await uploadFile('patient-media', path, uri, mimeType);
    if (error) return { error: error.message };

    const { error: insertError } = await supabase.from('rhythm_sounds').insert({
      patient_id: patientId,
      audio_url: path,
      label: label || null,
      trim_start_seconds: trimStart,
    });
    if (insertError) return { error: insertError.message };

    await refresh();
    return { error: null };
  };

  const removeSound = async (id: string): Promise<SaveResult> => {
    const { error } = await supabase.from('rhythm_sounds').delete().eq('id', id);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  };

  return { sounds, isLoading, addSound, removeSound };
}
