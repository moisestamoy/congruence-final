import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskGroup, Note, TaskPriority } from '../../types';
import { generateId } from '../../utils/id';

export const GROUP_PALETTE = [
    '#e05252','#e07d3c','#c8920a','#8fbb5a','#4caf7d',
    '#3aada8','#5b8dd9','#7c6fcd','#d95b8a','#7a8fa6',
];

export const DEFAULT_GROUPS: TaskGroup[] = [
    { id: 'antoecom', name: 'AntoEcom',  color: '#5b8dd9' },
    { id: 'casa',     name: 'Casa',      color: '#c8920a' },
    { id: 'personal', name: 'Personal',  color: '#3aada8' },
    { id: 'otras',    name: 'Otras',     color: '#7a8fa6' },
];

// Seed tasks — user's real data, seeded as defaults
const DEFAULT_TASKS: Task[] = [
    { id: 'seed-t1', text: 'reporte de ventas(saber de donde vinieron y por que)', priority: '!',  deadline: '2026-05-30', groupId: 'antoecom', completed: false, completedAt: null, createdAt: 1748649600001 },
    { id: 'seed-t2', text: 'laboratorio de contenido',                             priority: null, deadline: null,         groupId: 'antoecom', completed: false, completedAt: null, createdAt: 1748649600002 },
    { id: 'seed-t3', text: 'comprobantes excel pagos',                             priority: null, deadline: null,         groupId: 'antoecom', completed: false, completedAt: null, createdAt: 1748649600003 },
    { id: 'seed-t4', text: 'reporte de llamdas viernes',                           priority: null, deadline: '2026-06-06', groupId: 'antoecom', completed: false, completedAt: null, createdAt: 1748649600004 },
    { id: 'seed-t5', text: 'decoraciones casa',                                    priority: null, deadline: null,         groupId: 'casa',     completed: false, completedAt: null, createdAt: 1748649600005 },
    { id: 'seed-t6', text: 'script nuevo antoecom ENFOCADO EN RESOLVER DINERO LOGISTICO', priority: null, deadline: null, groupId: 'otras',    completed: false, completedAt: null, createdAt: 1748649600006 },
];

interface TaskState {
    tasks: Task[];
    groups: TaskGroup[];
    notes: Note[];
    soundEnabled: boolean;

    // Tasks
    addTask: (data: { text: string; priority: TaskPriority; deadline: string | null; groupId: string | null }) => void;
    toggleTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Pick<Task, 'text' | 'priority' | 'deadline' | 'groupId'>>) => void;
    removeTask: (id: string) => void;

    // Groups
    addGroup: (name: string, color: string) => void;
    updateGroup: (id: string, updates: Partial<Pick<TaskGroup, 'name' | 'color'>>) => void;
    removeGroup: (id: string) => void;

    // Notes
    addNote: (title: string, content: string) => void;
    updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
    removeNote: (id: string) => void;

    // Settings
    toggleSound: () => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set) => ({
            tasks: DEFAULT_TASKS,
            groups: DEFAULT_GROUPS,
            notes: [],
            soundEnabled: true,

            addTask: ({ text, priority, deadline, groupId }) =>
                set((s) => ({
                    tasks: [
                        ...s.tasks,
                        { id: generateId(), text, priority, deadline, groupId, completed: false, completedAt: null, createdAt: Date.now() }
                    ]
                })),

            toggleTask: (id) =>
                set((s) => ({
                    tasks: s.tasks.map(t =>
                        t.id === id
                            ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null }
                            : t
                    )
                })),

            updateTask: (id, updates) =>
                set((s) => ({
                    tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
                })),

            removeTask: (id) =>
                set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

            addGroup: (name, color) =>
                set((s) => ({
                    groups: [...s.groups, { id: generateId(), name, color }]
                })),

            updateGroup: (id, updates) =>
                set((s) => ({
                    groups: s.groups.map(g => g.id === id ? { ...g, ...updates } : g)
                })),

            removeGroup: (id) =>
                set((s) => ({
                    groups: s.groups.filter(g => g.id !== id),
                    tasks: s.tasks.map(t => t.groupId === id ? { ...t, groupId: null } : t)
                })),

            addNote: (title, content) =>
                set((s) => ({
                    notes: [{
                        id: generateId(),
                        title,
                        content,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }, ...s.notes]
                })),

            updateNote: (id, updates) =>
                set((s) => ({
                    notes: s.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)
                })),

            removeNote: (id) =>
                set((s) => ({ notes: s.notes.filter(n => n.id !== id) })),

            toggleSound: () =>
                set((s) => ({ soundEnabled: !s.soundEnabled })),
        }),
        {
            name: 'congruence-tasks-v2',
            version: 2,
            migrate: () => ({
                tasks: DEFAULT_TASKS,
                groups: DEFAULT_GROUPS,
                notes: [],
                soundEnabled: true,
            }),
        }
    )
);
