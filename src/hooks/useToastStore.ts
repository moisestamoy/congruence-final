import { create } from 'zustand';
import { generateId } from '../utils/id';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

const MAX_TOASTS = 5;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

interface ToastStore {
    toasts: ToastItem[];
    toast: (message: string, type?: ToastType) => void;
    dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    toast: (message, type = 'info') => {
        const id = generateId();
        set((s) => ({
            toasts: [...s.toasts.slice(-(MAX_TOASTS - 1)), { id, message, type }],
        }));
        timers.set(id, setTimeout(() => {
            timers.delete(id);
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500));
    },
    dismiss: (id) => {
        const timer = timers.get(id);
        if (timer) { clearTimeout(timer); timers.delete(id); }
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
}));

/** Call from outside React components (e.g., store actions) */
export const toast = (message: string, type: ToastType = 'info') =>
    useToastStore.getState().toast(message, type);
