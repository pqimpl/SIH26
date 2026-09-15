import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { extensionFor, getSignedUrl, uploadFile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth-state';

type CaregiverProfile = {
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type PatientProfile = {
  id: string;
  name: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type SaveResult = { error: string | null };

type AppState = {
  hasOnboarded: boolean;
  completeOnboarding: () => void;

  isLoadingProfiles: boolean;
  caregiver: CaregiverProfile | null;
  patient: PatientProfile | null;
  patientName: string;

  saveCaregiverProfile: (input: {
    displayName: string;
    imageUri?: string | null;
    imageMimeType?: string | null;
  }) => Promise<SaveResult>;
  savePatientProfile: (input: {
    name: string;
    imageUri?: string | null;
    imageMimeType?: string | null;
  }) => Promise<SaveResult>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [caregiver, setCaregiver] = useState<CaregiverProfile | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  const refreshProfiles = useCallback(async () => {
    if (!session) {
      setCaregiver(null);
      setPatient(null);
      setIsLoadingProfiles(false);
      return;
    }

    setIsLoadingProfiles(true);

    const [{ data: caregiverRow }, { data: patientRows }] = await Promise.all([
      supabase.from('caregivers').select('display_name, avatar_url').eq('id', session.user.id).single(),
      supabase.from('patients').select('id, name, avatar_url').order('created_at').limit(1),
    ]);

    if (caregiverRow) {
      const avatarUrl = await getSignedUrl('avatars', caregiverRow.avatar_url);
      setCaregiver({
        displayName: caregiverRow.display_name,
        avatarPath: caregiverRow.avatar_url,
        avatarUrl,
      });
    } else {
      setCaregiver(null);
    }

    const patientRow = patientRows?.[0];
    if (patientRow) {
      const avatarUrl = await getSignedUrl('patient-media', patientRow.avatar_url);
      setPatient({
        id: patientRow.id,
        name: patientRow.name,
        avatarPath: patientRow.avatar_url,
        avatarUrl,
      });
    } else {
      setPatient(null);
    }

    setIsLoadingProfiles(false);
  }, [session]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const saveCaregiverProfile: AppState['saveCaregiverProfile'] = async ({
    displayName,
    imageUri,
    imageMimeType,
  }) => {
    if (!session) return { error: 'You must be signed in.' };
    try {
      let avatarPath = caregiver?.avatarPath ?? null;
      if (imageUri) {
        avatarPath = `${session.user.id}/avatar.${extensionFor(imageUri, imageMimeType)}`;
        const { error: uploadError } = await uploadFile('avatars', avatarPath, imageUri, imageMimeType);
        if (uploadError) return { error: uploadError.message };
      }

      const { error } = await supabase
        .from('caregivers')
        .update({ display_name: displayName, avatar_url: avatarPath })
        .eq('id', session.user.id);
      if (error) return { error: error.message };

      await refreshProfiles();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save your profile.' };
    }
  };

  const savePatientProfile: AppState['savePatientProfile'] = async ({
    name,
    imageUri,
    imageMimeType,
  }) => {
    if (!session) return { error: 'You must be signed in.' };
    try {
      if (patient) {
        let avatarPath = patient.avatarPath;
        if (imageUri) {
          avatarPath = `${patient.id}/avatar.${extensionFor(imageUri, imageMimeType)}`;
          const { error: uploadError } = await uploadFile('patient-media', avatarPath, imageUri, imageMimeType);
          if (uploadError) return { error: uploadError.message };
        }
        const { error } = await supabase
          .from('patients')
          .update({ name, avatar_url: avatarPath })
          .eq('id', patient.id);
        if (error) return { error: error.message };
      } else {
        const { data: created, error } = await supabase
          .from('patients')
          .insert({ created_by: session.user.id, name })
          .select('id')
          .single();
        if (error || !created) return { error: error?.message ?? 'Could not create patient profile.' };

        if (imageUri) {
          const avatarPath = `${created.id}/avatar.${extensionFor(imageUri, imageMimeType)}`;
          const { error: uploadError } = await uploadFile('patient-media', avatarPath, imageUri, imageMimeType);
          if (uploadError) return { error: uploadError.message };
          await supabase.from('patients').update({ avatar_url: avatarPath }).eq('id', created.id);
        }
      }

      await refreshProfiles();
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not save patient profile.' };
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        hasOnboarded,
        completeOnboarding: () => setHasOnboarded(true),
        isLoadingProfiles,
        caregiver,
        patient,
        patientName: patient?.name ?? 'there',
        saveCaregiverProfile,
        savePatientProfile,
      }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
