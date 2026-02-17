import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task } from '../../types';

interface TaskState {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id' | 'completed' | 'tags'>) => void;
    toggleTask: (id: string) => void;
    removeTask: (id: string) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    getCompletedTodayCount: () => number;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            tasks: [
                {
                    id: '1',
                    title: 'Definir objetivos Q1',
                    category: 'Work',
                    priority: 'high',
                    completed: false,
                    tags: ['Strategy'],
                    dueDate: '2026-01-10'
                },
                {
                    id: '2',
                    title: 'Hacer compra semanal',
                    category: 'Personal',
                    priority: 'medium',
                    completed: false,
                    tags: ['Groceries'],
                },
                {
                    id: '3',
                    title: 'Revisar Plan de Pensiones',
                    category: 'Finance',
                    priority: 'low',
                    completed: true,
                    tags: ['Money'],
                }
            ],
            addTask: (taskData) => {
                const newTask: Task = {
                    ...taskData,
                    id: crypto.randomUUID(),
                    completed: false,
                    tags: []
                };
                set((state) => ({ tasks: [newTask, ...state.tasks] }));
            },
            toggleTask: (id) => {
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, completed: !t.completed } : t
                    )
                }));
            },
            removeTask: (id) => {
                set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }));
            },
            updateTask: (id, updates) => {
                set((state) => ({
                    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
                }));
            },
            getCompletedTodayCount: () => {
                // Simplification: counting all completed for now, strictly "today" requires a completedAt timestamp
                return get().tasks.filter(t => t.completed).length;
            }
        }),
        {
            name: 'lifeos-tasks-storage',
        }
    )
);
