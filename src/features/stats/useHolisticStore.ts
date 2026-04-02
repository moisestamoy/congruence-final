import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../../utils/id';
import type { IdentityAxis } from '../../types';

export interface HolisticCheckIn {
    id: string;
    date: string; // ISO 8601 string
    physical: number; // 0-10
    emotional: number; // 0-10
    vision: number; // 0-10
    standards: number; // 0-10
    growth: number; // 0-10
    environment: number; // 0-10
    note?: string;
    weeklyReflection?: string; // Sunday-only optional reflection
}

interface HolisticState {
    checkIns: HolisticCheckIn[];
    addCheckIn: (checkIn: Omit<HolisticCheckIn, 'id' | 'date'>) => void;
    getLatestCheckIn: () => HolisticCheckIn | null;
    getCheckInAxesForDay: (date?: Date) => IdentityAxis[];
    isFullCheckIn: (date?: Date) => boolean;
}

// Rotating axes by day of week
const AXIS_ROTATION: Record<number, IdentityAxis[]> = {
    1: ['physical', 'standards'],     // Monday
    2: ['physical', 'standards'],     // Tuesday
    3: ['growth', 'vision'],          // Wednesday
    4: ['growth', 'vision'],          // Thursday
    5: ['emotional', 'environment'],  // Friday
    6: ['emotional', 'environment'],  // Saturday (flexible catch-up)
    0: ['physical', 'emotional', 'vision', 'standards', 'growth', 'environment'], // Sunday — full check-in
};

export const useHolisticStore = create<HolisticState>()(
    persist(
        (set, get) => ({
            checkIns: [],

            addCheckIn: (checkIn) => set((state) => ({
                checkIns: [
                    {
                        ...checkIn,
                        id: generateId(),
                        date: new Date().toISOString()
                    },
                    ...state.checkIns
                ]
            })),

            getLatestCheckIn: () => {
                const { checkIns } = get();
                return checkIns.length > 0 ? checkIns[0] : null;
            },

            getCheckInAxesForDay: (date?: Date) => {
                const d = date ?? new Date();
                const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday...
                return AXIS_ROTATION[dayOfWeek] ?? AXIS_ROTATION[5];
            },

            isFullCheckIn: (date?: Date) => {
                const d = date ?? new Date();
                return d.getDay() === 0; // Sunday
            },
        }),
        {
            name: 'congruence-holistic-storage'
        }
    )
);
