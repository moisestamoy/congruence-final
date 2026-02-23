import { create } from 'zustand';

interface FabState {
    fabActionTick: number;
    triggerFab: () => void;
}

export const useFabStore = create<FabState>((set) => ({
    fabActionTick: 0,
    triggerFab: () => set((state) => ({ fabActionTick: state.fabActionTick + 1 })),
}));
