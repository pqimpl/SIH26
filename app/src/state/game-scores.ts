import { supabase } from '@/lib/supabase';
import { GameType, Json } from '@/lib/database.types';

export async function recordGameScore(
  patientId: string,
  gameType: GameType,
  score: number,
  metric?: Json
) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  await supabase.from('game_scores').insert({
    patient_id: patientId,
    game_type: gameType,
    score: clamped,
    metric: metric ?? null,
  });
}
