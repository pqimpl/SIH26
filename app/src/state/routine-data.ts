import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type RoutineItem = {
  id: string;
  title: string;
  icon: string;
  scheduledTime: string | null;
  done: boolean;
};

type SaveResult = { error: string | null };

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useRoutineItems(patientId: string | null) {
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const today = todayDateString();
    const [{ data: routineRows }, { data: completionRows }] = await Promise.all([
      supabase
        .from('routine_items')
        .select('id, title, icon, scheduled_time')
        .eq('patient_id', patientId)
        .eq('enabled', true)
        .order('scheduled_time', { ascending: true, nullsFirst: false }),
      supabase
        .from('daily_completions')
        .select('routine_item_id')
        .eq('patient_id', patientId)
        .eq('completed_date', today),
    ]);

    const doneIds = new Set((completionRows ?? []).map((row) => row.routine_item_id));
    setItems(
      (routineRows ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        icon: row.icon ?? 'checkbox-marked-circle-outline',
        scheduledTime: row.scheduled_time,
        done: doneIds.has(row.id),
      }))
    );
    setIsLoading(false);
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleCompletion = async (item: RoutineItem): Promise<SaveResult> => {
    if (!patientId) return { error: 'No patient selected.' };
    const today = todayDateString();

    // Optimistic update so the celebration/animation feels instant.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));

    if (item.done) {
      const { error } = await supabase
        .from('daily_completions')
        .delete()
        .eq('routine_item_id', item.id)
        .eq('completed_date', today);
      if (error) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: true } : i)));
        return { error: error.message };
      }
    } else {
      const { error } = await supabase.from('daily_completions').insert({
        routine_item_id: item.id,
        patient_id: patientId,
        completed_date: today,
      });
      if (error) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: false } : i)));
        return { error: error.message };
      }
    }
    return { error: null };
  };

  const addRoutine = async (input: {
    title: string;
    icon: string;
    scheduledTime: string | null;
  }): Promise<SaveResult> => {
    if (!patientId) return { error: 'No patient selected.' };
    const { error } = await supabase.from('routine_items').insert({
      patient_id: patientId,
      title: input.title,
      icon: input.icon,
      scheduled_time: input.scheduledTime,
    });
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  };

  const updateRoutine = async (
    id: string,
    input: { title: string; icon: string; scheduledTime: string | null }
  ): Promise<SaveResult> => {
    const { error } = await supabase
      .from('routine_items')
      .update({ title: input.title, icon: input.icon, scheduled_time: input.scheduledTime })
      .eq('id', id);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  };

  const deleteRoutine = async (id: string): Promise<SaveResult> => {
    const { error } = await supabase.from('routine_items').delete().eq('id', id);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  };

  return { items, isLoading, toggleCompletion, addRoutine, updateRoutine, deleteRoutine, refresh };
}
