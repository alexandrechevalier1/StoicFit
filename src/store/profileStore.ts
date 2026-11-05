import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile } from '../models';

const STORAGE_KEY = '@stoicfit/profile';

interface ProfileStore {
  profile: UserProfile | null;
  displayName: string;
  avatarUri?: string;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setDisplayName: (name: string) => void;
  setAvatarUri: (uri: string) => void;
}

type PersistedProfile = Pick<ProfileStore, 'profile' | 'displayName' | 'avatarUri'>;

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: null,
      displayName: 'Athlète',
      avatarUri: undefined,

      setProfile: (profile) => set({ profile }),

      clearProfile: () => set({ profile: null }),

      setDisplayName: (name) => set({ displayName: name }),

      setAvatarUri: (uri) => set({ avatarUri: uri }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // On ne sauvegarde que les données, pas les fonctions.
      partialize: (state): PersistedProfile => ({
        profile: state.profile,
        displayName: state.displayName,
        avatarUri: state.avatarUri,
      }),
    }
  )
);
