import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'theme' | 'badge' | 'feature';
    icon: string;
    acquired?: boolean;
}

export const STORE_ITEMS: StoreItem[] = [
    {
        id: 'theme_cyberpunk',
        name: 'Cyberpunk Neon',
        description: 'Una interfaz futurista con colores vibrantes y efectos de neón.',
        price: 500,
        type: 'theme',
        icon: 'Zap'
    },
    {
        id: 'theme_zen',
        name: 'Modo Zen',
        description: 'Minimalismo puro. Blanco y negro para máxima concentración.',
        price: 300,
        type: 'theme',
        icon: 'Wind'
    },
    {
        id: 'badge_stoic',
        name: 'Insignia Estoica',
        description: 'Demuestra tu compromiso inquebrantable.',
        price: 1000,
        type: 'badge',
        icon: 'Award'
    },
    {
        id: 'feature_analytics_pro',
        name: 'Analíticas Pro',
        description: 'Desbloquea gráficos avanzados de correlación.',
        price: 2000,
        type: 'feature',
        icon: 'BarChart2'
    }
];

interface GameState {
    points: number;
    inventory: string[]; // List of item IDs owned
    history: { id: string; type: 'earn' | 'spend'; amount: number; description: string; date: string }[];

    // Actions
    addPoints: (amount: number, reason: string) => void;
    purchaseItem: (itemId: string) => boolean; // Returns success/fail
    hasItem: (itemId: string) => boolean;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            points: 100, // Starting bonus
            inventory: [],
            history: [{ id: 'init', type: 'earn', amount: 100, description: 'Bono de bienvenida', date: new Date().toISOString() }],

            addPoints: (amount, reason) => set((state) => ({
                points: state.points + amount,
                history: [
                    { id: crypto.randomUUID(), type: 'earn', amount, description: reason, date: new Date().toISOString() },
                    ...state.history
                ]
            })),

            purchaseItem: (itemId) => {
                const state = get();
                const item = STORE_ITEMS.find((i) => i.id === itemId);

                if (!item) return false;
                if (state.inventory.includes(itemId)) return false; // Already owned
                if (state.points < item.price) return false; // Too poor

                set((state) => ({
                    points: state.points - item.price,
                    inventory: [...state.inventory, itemId],
                    history: [
                        { id: crypto.randomUUID(), type: 'spend', amount: item.price, description: `Comprado: ${item.name}`, date: new Date().toISOString() },
                        ...state.history
                    ]
                }));
                return true;
            },

            hasItem: (itemId) => get().inventory.includes(itemId),
        }),
        {
            name: 'congruence-game-store',
        }
    )
);
