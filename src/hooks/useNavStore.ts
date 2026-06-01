import { create } from 'zustand';

interface NavState {
    navVisible: boolean;
    setNavVisible: (v: boolean) => void;
}

export const useNavStore = create<NavState>((set) => ({
    navVisible: true,
    setNavVisible: (v) => set({ navVisible: v }),
}));
