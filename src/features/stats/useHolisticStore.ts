import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../../utils/id';

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
}

interface HolisticState {
    checkIns: HolisticCheckIn[];
    addCheckIn: (checkIn: Omit<HolisticCheckIn, 'id' | 'date'>) => void;
    getLatestCheckIn: () => HolisticCheckIn | null;
}

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
            }
        }),
        {
            name: 'congruence-holistic-storage'
        }
    )
);
