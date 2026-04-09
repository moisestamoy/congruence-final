import { create } from 'zustand';
import { generateId } from '../utils/id';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastStore {
    toasts: ToastItem[];
    toast: (message: string, type?: ToastType) => void;
    dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    toast: (message, type = 'info') => {
        const id = generateId();
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
    },
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Call from outside React components (e.g., store actions) */
export const toast = (message: string, type: ToastType = 'info') =>
    useToastStore.getState().toast(message, type);
