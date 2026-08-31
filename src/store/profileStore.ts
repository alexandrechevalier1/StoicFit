import { create } from 'zustand';
import type { UserProfile } from '../models';

interface ProfileStore {
  profile: UserProfile | null;
  displayName: string;
  avatarUri?: string;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setDisplayName: (name: string) => void;
  setAvatarUri: (uri: string) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  displayName: 'Athlète',
  avatarUri: undefined,

  setProfile: (profile) => set({ profile }),

  clearProfile: () => set({ profile: null }),

  setDisplayName: (name) => set({ displayName: name }),

  setAvatarUri: (uri) => set({ avatarUri: uri }),
}));
