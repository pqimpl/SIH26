import { useCallback, useEffect, useState } from 'react';

import { extensionFor, getSignedUrl, uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

type SaveResult = { error: string | null };

export function usePuzzleImage(patientId: string | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('puzzle_images')
      .select('image_url')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setImageUrl(data ? await getSignedUrl('patient-media', data.image_url) : null);
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadPuzzleImage = async (uri: string, mimeType?: string | null): Promise<SaveResult> => {
    if (!patientId) return { error: 'No patient selected.' };
    const path = `${patientId}/puzzle/${Date.now()}.${extensionFor(uri, mimeType)}`;
    const { error } = await uploadFile('patient-media', path, uri, mimeType);
    if (error) return { error: error.message };

    const { error: insertError } = await supabase
      .from('puzzle_images')
      .insert({ patient_id: patientId, image_url: path });
    if (insertError) return { error: insertError.message };

    await refresh();
    return { error: null };
  };

  return { imageUrl, isLoading, uploadPuzzleImage };
}
