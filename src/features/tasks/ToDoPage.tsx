import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO, isToday, isPast, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { useTaskStore, GROUP_PALETTE } from './useTaskStore';
import { useTheme } from '../../hooks/useTheme';
import { TaskPriority } from '../../types';
import { useFabStore } from '../../hooks/useFabStore';

// ── SOUND SYSTEM ─────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _audioCtx;
}
function playKey(on: boolean) {
    if (!on) return;
    try {
        const ctx = getCtx();
        const buf = ctx.createBuffer(1, 512, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < 512; i++) d[i] = (Math.random() * 2 - 1) * 0.08;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 950; f.Q.value = 1.5;
        src.connect(f); f.connect(ctx.destination);
        src.start(); src.stop(ctx.currentTime + 0.04);
    } catch {}
}
function playBell(on: boolean) {
    if (!on) return;
    try {
        const ctx = getCtx();
        [1318, 2637, 3956].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq; osc.type = 'sine';
            gain.gain.setValueAtTime(0.15 / (i + 1), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.7);
        });
    } catch {}
}
function playPop(on: boolean) {
    if (!on) return;
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch {}
}

// ── GROUP PICKER ──────────────────────────────────────────────────────────────
function GroupPicker({ groups, selectedId, onSelect, onCreate, onClose, anchor }: {
    groups: { id: string; name: string; color: string }[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onCreate: (name: string, color: string) => void;
    onClose: () => void;
    anchor: { top: number; left: number };
}) {
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(GROUP_PALETTE[0]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        // Defer to avoid the opening click immediately triggering close
        const tid = setTimeout(() => document.addEventListener('mousedown', handler), 50);
        return () => { clearTimeout(tid); document.removeEventListener('mousedown', handler); };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[9999] w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: anchor.top + 4, left: anchor.left }}
        >
            <div className="p-2 space-y-0.5">
                {selectedId && (
                    <button
                        onClick={() => { onSelect(null); onClose(); }}
                        className="w-full text-left px-3 py-2 text-[11px] text-neutral-500 hover:text-neutral-300 hover:bg-white/5 rounded-lg font-courier transition-colors"
                    >
                        — sin grupo
                    </button>
                )}
                {groups.map(g => (
                    <button
                        key={g.id}
                        onClick={() => { onSelect(g.id); onClose(); }}
                        className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-[12px] font-courier rounded-lg transition-colors",
                            selectedId === g.id ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                        {g.name}
                    </button>
                ))}
            </div>
            <div className="border-t border-white/5 p-3 space-y-2">
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="nuevo grupo..."
                    className="w-full bg-transparent text-[11px] font-courier text-white/70 placeholder-white/20 outline-none border-b border-white/10 pb-1"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && newName.trim()) {
                            onCreate(newName.trim(), newColor);
                            setNewName('');
                            onClose();
                        }
                    }}
                />
                <div className="flex gap-1 flex-wrap">
                    {GROUP_PALETTE.map(c => (
                        <button
                            key={c}
                            onClick={() => setNewColor(c)}
                            className={cn("w-4 h-4 rounded-full transition-transform", newColor === c && "ring-1 ring-white scale-110")}
                            style={{ background: c }}
                        />
                    ))}
                </div>
                {newName.trim() && (
                    <button
                        onClick={() => { onCreate(newName.trim(), newColor); setNewName(''); onClose(); }}
                        className="text-[10px] font-courier text-white/50 hover:text-white transition-colors"
                    >
                        crear grupo →
                    </button>
                )}
            </div>
        </div>
    );
}

// ── TASK ITEM ─────────────────────────────────────────────────────────────────
function TaskItem({ task, groups, soundEnabled, isAccion, onToggle, onUpdate, onDelete, onCreateGroup }: {
    task: { id: string; text: string; priority: TaskPriority; deadline: string | null; groupId: string | null; completed: boolean; createdAt: number };
    groups: { id: string; name: string; color: string }[];
    soundEnabled: boolean;
    isAccion: boolean;
    onToggle: () => void;
    onUpdate: (updates: any) => void;
    onDelete: () => void;
    onCreateGroup: (name: string, color: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(task.text);
    const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
    const [editDeadline, setEditDeadline] = useState(task.deadline || '');
    const [editGroupId, setEditGroupId] = useState(task.groupId);
    const [groupPickerOpen, setGroupPickerOpen] = useState(false);
    const [gpAnchor, setGpAnchor] = useState({ top: 0, left: 0 });
    const dateRef = useRef<HTMLInputElement>(null);
    const grpBtnRef = useRef<HTMLButtonElement>(null);


    const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline));

    // Border: red in ACCIÓN always, red in Classic when overdue, amber in Classic otherwise
    const priorityBorderColor = isAccion || isOverdue ? '#ef4444' : '#c8920a';
    const priorityBorderStyle = task.priority
        ? { borderLeft: `2px solid ${priorityBorderColor}`, paddingLeft: '10px' }
        : { borderLeft: '2px solid transparent', paddingLeft: '10px' };

    const saveEdit = () => {
        if (editText.trim()) {
            onUpdate({ text: editText.trim(), priority: editPriority, deadline: editDeadline || null, groupId: editGroupId });
        }
        setEditing(false);
    };

    const formatDeadline = (d: string) => {
        const date = parseISO(d);
        if (isToday(date)) return 'hoy';
        if (isYesterday(date)) return 'ayer';
        return format(date, "d MMM", { locale: es });
    };

    if (editing) {
        return (
            <motion.div layout className="py-2 px-0" style={priorityBorderStyle}>
                <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                    className="w-full bg-transparent font-courier text-sm text-white border-b border-white/20 pb-1 outline-none mb-2"
                />
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setEditPriority(editPriority === '!!' ? '!' : editPriority === '!' ? null : '!!')}
                        className={cn(
                            "text-[11px] font-courier italic transition-colors",
                            editPriority ? (isAccion ? "text-red-400 font-bold" : "text-amber-400 font-bold") : "text-neutral-600 hover:text-neutral-400"
                        )}
                    >
                        {editPriority === '!!' ? '!!' : editPriority === '!' ? '!' : '! prioridad'}
                    </button>
                    <button
                        onClick={() => { dateRef.current?.showPicker?.() || dateRef.current?.click(); }}
                        className="text-[11px] font-courier italic text-neutral-600 hover:text-neutral-400 transition-colors"
                    >
                        {editDeadline ? formatDeadline(editDeadline) : '+ fecha'}
                    </button>
                    <input ref={dateRef} type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="opacity-0 w-0 h-0 absolute" />
                    <button
                        ref={grpBtnRef}
                        onClick={() => { const r = grpBtnRef.current?.getBoundingClientRect(); if (r) { setGpAnchor({ top: r.bottom, left: r.left }); setGroupPickerOpen(true); } }}
                        className="text-[11px] font-courier italic text-neutral-600 hover:text-neutral-400 transition-colors"
                        style={editGroupId ? { color: groups.find(g => g.id === editGroupId)?.color } : {}}
                    >
                        # {groups.find(g => g.id === editGroupId)?.name || 'grupo'}
                    </button>
                    <button onClick={saveEdit} className="text-[11px] font-courier italic text-white/50 hover:text-white ml-auto transition-colors">guardar</button>
                    <button onClick={() => setEditing(false)} className="text-[11px] font-courier italic text-neutral-700 hover:text-neutral-400 transition-colors">cancelar</button>
                </div>
                {groupPickerOpen && (
                    <GroupPicker
                        groups={groups} selectedId={editGroupId}
                        onSelect={id => setEditGroupId(id)}
                        onCreate={onCreateGroup}
                        onClose={() => setGroupPickerOpen(false)}
                        anchor={gpAnchor}
                    />
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-baseline gap-3 py-2 group"
            style={priorityBorderStyle}
        >
            {/* Complete circle */}
            <button
                onClick={() => { onToggle(); if (!task.completed) playBell(soundEnabled); else playPop(soundEnabled); }}
                className={cn(
                    "w-[11px] h-[11px] rounded-full border transition-all shrink-0 mt-0.5",
                    task.completed
                        ? (isAccion ? "bg-red-500/60 border-red-500" : "bg-amber-500/60 border-amber-500")
                        : "border-white/20 hover:border-white/50"
                )}
            />

            {/* Priority marker */}
            <span className={cn(
                "text-[11px] font-courier shrink-0 w-3 transition-all",
                task.priority ? (isAccion ? "text-red-400 font-bold" : "text-amber-400 font-bold") : "text-transparent group-hover:text-white/10"
            )}>
                {task.priority || '·'}
            </span>

            {/* Text */}
            <span
                onClick={() => { setEditing(true); setEditText(task.text); setEditPriority(task.priority); setEditDeadline(task.deadline || ''); setEditGroupId(task.groupId); }}
                className={cn(
                    "flex-1 font-courier text-sm leading-relaxed cursor-pointer transition-all relative",
                    task.completed ? "text-white/25 line-through decoration-white/20" : "text-white/80 hover:text-white"
                )}
            >
                {task.text}
            </span>

            {/* Deadline */}
            {task.deadline && (
                <span className={cn(
                    "text-[11px] font-courier italic shrink-0",
                    isOverdue ? "text-red-400" : "text-white/40"
                )}>
                    {formatDeadline(task.deadline)}
                </span>
            )}

            {/* Actions (hover) */}
            <div className={cn("flex items-center gap-2 transition-all", hovered ? "opacity-100" : "opacity-0")}>
                <button onClick={() => { setEditing(true); setEditText(task.text); setEditPriority(task.priority); setEditDeadline(task.deadline || ''); setEditGroupId(task.groupId); }}
                    className="text-[11px] text-white/30 hover:text-white/60 font-courier transition-colors">✎</button>
                <button onClick={() => { playPop(soundEnabled); onDelete(); }}
                    className="text-[11px] text-white/35 hover:text-red-400 font-courier transition-colors">×</button>
            </div>
        </motion.div>
    );
}

// ── DIARY VIEW ────────────────────────────────────────────────────────────────
function DiaryView({ notes, soundEnabled, isAccion, onAdd, onUpdate, onDelete }: {
    notes: any[];
    soundEnabled: boolean;
    isAccion: boolean;
    onAdd: (title: string, content: string) => void;
    onUpdate: (id: string, updates: any) => void;
    onDelete: (id: string) => void;
}) {
    const [title, setTitle] = useState(() => localStorage.getItem('congruence_draft_title') || '');
    const [content, setContent] = useState(() => localStorage.getItem('congruence_draft') || '');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { localStorage.setItem('congruence_draft', content); }, [content]);
    useEffect(() => { localStorage.setItem('congruence_draft_title', title); }, [title]);

    const autoGrow = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const save = () => {
        if (!content.trim() && !title.trim()) return;
        onAdd(title.trim() || 'Sin título', content.trim());
        playBell(soundEnabled);
        setTitle(''); setContent('');
        localStorage.removeItem('congruence_draft');
        localStorage.removeItem('congruence_draft_title');
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    const formatNoteDate = (ts: number) => format(new Date(ts), "EEE d MMM · HH:mm", { locale: es });

    return (
        <div className="space-y-8">
            {/* Composer */}
            <div className="space-y-3">
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="título..."
                    className="w-full bg-transparent font-courier text-base font-bold text-white/80 placeholder-white/30 outline-none border-b border-white/8 pb-2"
                />
                <div className="border-b border-white/5 my-0" />
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => { setContent(e.target.value); autoGrow(); }}
                    placeholder="escribe algo..."
                    rows={3}
                    className="w-full bg-transparent font-courier text-sm text-white/70 placeholder-white/30 outline-none resize-none leading-relaxed"
                    style={{ minHeight: '72px' }}
                />
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-courier text-white/15">
                        {wordCount} palabras · {charCount} caracteres
                    </span>
                    <button
                        onClick={save}
                        disabled={!content.trim() && !title.trim()}
                        className={cn(
                            "text-[11px] font-courier italic transition-colors",
                            content.trim() || title.trim()
                                ? isAccion ? "text-red-400/70 hover:text-red-300" : "text-white/40 hover:text-white/70"
                                : "text-white/10 cursor-not-allowed"
                        )}
                    >
                        guardar nota →
                    </button>
                </div>
            </div>

            {/* Note list */}
            {notes.length > 0 && (
                <div className="space-y-0 border-t border-white/5 pt-6">
                    <AnimatePresence>
                        {notes.map(note => (
                            <motion.div
                                key={note.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b border-white/5 py-4 group"
                            >
                                {editingId === note.id ? (
                                    <div className="space-y-2">
                                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                            className="w-full bg-transparent font-courier text-sm font-bold text-white/80 outline-none border-b border-white/10 pb-1" />
                                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                                            rows={3}
                                            className="w-full bg-transparent font-courier text-sm text-white/60 outline-none resize-none" />
                                        <div className="flex gap-3">
                                            <button onClick={() => { onUpdate(note.id, { title: editTitle, content: editContent }); setEditingId(null); }}
                                                className="text-[11px] font-courier italic text-white/40 hover:text-white transition-colors">guardar cambios →</button>
                                            <button onClick={() => setEditingId(null)}
                                                className="text-[11px] font-courier italic text-white/40 hover:text-white/70 transition-colors">cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}>
                                                <p className="text-[10px] font-courier text-white/40 mb-1">{formatNoteDate(note.createdAt)}</p>
                                                {note.title && note.title !== 'Sin título' && (
                                                    <p className="font-courier text-sm font-bold text-white/70 mb-1">{note.title}</p>
                                                )}
                                                <p className={cn("font-courier text-sm text-white/40 leading-relaxed", expandedId !== note.id && "line-clamp-2")}>
                                                    {note.content}
                                                </p>
                                                {expandedId === note.id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); }}
                                                        className="text-[10px] font-courier italic text-white/45 hover:text-white/70 mt-2 block transition-colors"
                                                    >
                                                        editar
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => { playPop(soundEnabled); onDelete(note.id); }}
                                                className="text-[11px] text-white/15 hover:text-red-400 font-courier opacity-0 group-hover:opacity-100 transition-all mt-1 shrink-0"
                                            >×</button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {notes.length === 0 && (
                <p className="font-cormorant italic text-white/15 text-center text-lg py-8">página en blanco</p>
            )}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ToDoPage() {
    const { theme } = useTheme();
    const isAccion = theme === 'accion';
    const { tasks, groups, notes, soundEnabled, addTask, toggleTask, updateTask, removeTask, addGroup, addNote, updateNote, removeNote, toggleSound } = useTaskStore();
    const { fabActionTick } = useFabStore();

    const [view, setView] = useState<'tareas' | 'hoy' | 'diario'>('tareas');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Task input state
    const [inputText, setInputText] = useState('');
    const [inputFocused, setInputFocused] = useState(false);
    const [inputPriority, setInputPriority] = useState<TaskPriority>(null);
    const [inputDeadline, setInputDeadline] = useState('');
    const [inputGroupId, setInputGroupId] = useState<string | null>(null);
    const [groupPickerOpen, setGroupPickerOpen] = useState(false);
    const [gpAnchor, setGpAnchor] = useState({ top: 0, left: 0 });

    // Filters
    const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
    const [filterPriority, setFilterPriority] = useState(false);

    const dateRef = useRef<HTMLInputElement>(null);
    const grpBtnRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    // FAB opens new task input
    useEffect(() => {
        if (fabActionTick > 0) { setView('tareas'); inputRef.current?.focus(); }
    }, [fabActionTick]); // eslint-disable-line

    const formattedDate = format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy · HH:mm", { locale: es });

    // Task helpers
    const today = format(new Date(), 'yyyy-MM-dd');

    const submitTask = () => {
        if (!inputText.trim()) return;
        addTask({ text: inputText.trim(), priority: inputPriority, deadline: inputDeadline || null, groupId: inputGroupId });
        playBell(soundEnabled);
        setInputText(''); setInputPriority(null); setInputDeadline(''); setInputGroupId(null);
    };

    const sortedTasks = [...tasks]
        .filter(t => {
            if (filterGroupId && t.groupId !== filterGroupId) return false;
            if (filterPriority && !t.priority) return false;
            return true;
        })
        .sort((a, b) => {
            const p = { '!!': 2, '!': 1, null: 0 };
            const pa = p[a.priority as keyof typeof p] ?? 0;
            const pb = p[b.priority as keyof typeof p] ?? 0;
            if (pb !== pa) return pb - pa;
            return a.createdAt - b.createdAt;
        });

    const pendingTasks = sortedTasks.filter(t => !t.completed);
    const doneToday = tasks.filter(t => t.completed && t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === today).length;

    // Today view
    const todayTasks = tasks
        .filter(t => t.deadline && (isToday(parseISO(t.deadline)) || (isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline)) && !t.completed)))
        .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));

    // Group tasks by groupId — pending and completed each go to their own group
    const groupedTasks = (() => {
        type GroupEntry = { groupId: string | null; tasks: typeof tasks; completedTasks: typeof tasks };
        const pendingMap = new Map<string | null, typeof tasks>();
        const completedMap = new Map<string | null, typeof tasks>();

        sortedTasks.filter(t => !t.completed).forEach(t => {
            if (!pendingMap.has(t.groupId)) pendingMap.set(t.groupId, []);
            pendingMap.get(t.groupId)!.push(t);
        });
        sortedTasks.filter(t => t.completed).forEach(t => {
            if (!completedMap.has(t.groupId)) completedMap.set(t.groupId, []);
            completedMap.get(t.groupId)!.push(t);
        });

        const allGroupIds = new Set<string | null>([...pendingMap.keys(), ...completedMap.keys()]);
        if (allGroupIds.size === 0) return [] as GroupEntry[];

        const result: GroupEntry[] = [];
        allGroupIds.forEach(gid => {
            result.push({
                groupId: gid,
                tasks: pendingMap.get(gid) || [],
                completedTasks: completedMap.get(gid) || [],
            });
        });

        // Sort by order in groups array (null/ungrouped last)
        result.sort((a, b) => {
            const ia = groups.findIndex(g => g.id === a.groupId);
            const ib = groups.findIndex(g => g.id === b.groupId);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        return result;
    })();

    const accentColor = isAccion ? 'text-red-400' : 'text-white/50';
    const activeTabStyle = isAccion ? 'text-white border-b border-red-500' : 'text-white border-b border-white/40';
    const hasGroupsOrFilter = groups.length > 0 || filterGroupId || filterPriority;

    return (
        <div className={cn(
            "min-h-screen font-courier pb-32 lg:pb-12 transition-colors duration-500",
            isAccion ? "bg-[#000000]" : "bg-[#050505]"
        )}>
            <div className="max-w-2xl mx-auto px-6 lg:px-8 pt-8 lg:pt-12">

                {/* ── Date / Time ── */}
                <div className="flex items-start justify-between mb-6 lg:mb-8">
                    <p className="font-cormorant italic text-white/50 text-xl lg:text-2xl leading-none select-none">
                        {formattedDate}
                    </p>
                    <button
                        onClick={toggleSound}
                        className={cn("text-[11px] font-courier transition-colors", soundEnabled ? accentColor : "text-white/15 hover:text-white/30")}
                        title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
                    >
                        {soundEnabled ? '♪' : '♩'}
                    </button>
                </div>

                {/* ── Tab Nav ── */}
                <nav className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
                    {(['tareas', 'hoy', 'diario'] as const).map((v, i) => (
                        <span key={v} className="flex items-center gap-4">
                            <button
                                onClick={() => setView(v)}
                                className={cn(
                                    "text-[13px] font-courier pb-1 transition-all",
                                    view === v ? activeTabStyle : "text-white/45 hover:text-white/75"
                                )}
                            >
                                {v}
                            </button>
                            {i < 2 && <span className="text-white/25 font-courier">·</span>}
                        </span>
                    ))}
                </nav>

                <AnimatePresence mode="wait">

                    {/* ── TAREAS VIEW ── */}
                    {view === 'tareas' && (
                        <motion.div
                            key="tareas"
                            initial={{ opacity: 0, y: 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 7 }}
                            transition={{ duration: 0.26 }}
                        >
                            {/* Task Input */}
                            <div className="mb-6">
                                <div className="relative border-b border-white/20 focus-within:border-white/50 transition-colors pb-1">
                                    {!inputFocused && !inputText && (
                                        <span className="blink absolute left-0 top-1 font-courier text-sm text-white/35 pointer-events-none select-none">_</span>
                                    )}
                                    <input
                                        ref={inputRef}
                                        value={inputText}
                                        onChange={e => { setInputText(e.target.value); playKey(soundEnabled); }}
                                        onFocus={() => setInputFocused(true)}
                                        onBlur={() => setInputFocused(false)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitTask(); }}
                                        placeholder={inputFocused ? '' : ''}
                                        className="w-full bg-transparent font-courier text-sm text-white/90 outline-none py-1"
                                    />
                                </div>

                                {/* Sub-row */}
                                <div className="flex items-center gap-4 mt-2.5">
                                    <button
                                        onClick={() => { dateRef.current?.showPicker?.() || dateRef.current?.click(); }}
                                        className={cn(
                                            "text-[11px] font-courier italic transition-colors",
                                            inputDeadline ? accentColor : "text-white/40 hover:text-white/70"
                                        )}
                                    >
                                        {inputDeadline ? format(parseISO(inputDeadline), "d MMM", { locale: es }) : '+ fecha'}
                                    </button>
                                    <input
                                        ref={dateRef}
                                        type="date"
                                        value={inputDeadline}
                                        onChange={e => setInputDeadline(e.target.value)}
                                        className="absolute opacity-0 w-0 h-0 pointer-events-none"
                                    />

                                    <button
                                        onClick={() => setInputPriority(inputPriority === '!!' ? '!' : inputPriority === '!' ? null : '!!')}
                                        className={cn(
                                            "text-[11px] font-courier italic transition-colors",
                                            inputPriority
                                                ? isAccion ? "text-red-400 font-bold not-italic" : "text-amber-400 font-bold not-italic"
                                                : "text-white/40 hover:text-white/70"
                                        )}
                                    >
                                        {inputPriority || '! prioridad'}
                                    </button>

                                    <button
                                        ref={grpBtnRef}
                                        onClick={() => {
                                            const r = grpBtnRef.current?.getBoundingClientRect();
                                            if (r) { setGpAnchor({ top: r.bottom, left: r.left }); setGroupPickerOpen(true); }
                                        }}
                                        className={cn("text-[11px] font-courier italic transition-colors")}
                                        style={inputGroupId ? { color: groups.find(g => g.id === inputGroupId)?.color } : { color: 'rgba(255,255,255,0.4)' }}
                                    >
                                        # {groups.find(g => g.id === inputGroupId)?.name || 'grupo'}
                                    </button>
                                </div>
                            </div>

                            {groupPickerOpen && (
                                <GroupPicker
                                    groups={groups} selectedId={inputGroupId}
                                    onSelect={id => setInputGroupId(id)}
                                    onCreate={(name, color) => addGroup(name, color)}
                                    onClose={() => setGroupPickerOpen(false)}
                                    anchor={gpAnchor}
                                />
                            )}

                            {/* Filter pills */}
                            {hasGroupsOrFilter && (
                                <div className="flex items-center gap-2 flex-wrap mb-5">
                                    <button
                                        onClick={() => setFilterPriority(!filterPriority)}
                                        className={cn(
                                            "text-[10px] font-courier px-2.5 py-1 rounded-full border transition-all",
                                            filterPriority
                                                ? isAccion ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-amber-500/50 text-amber-400 bg-amber-500/10"
                                                : "border-white/8 text-white/45 hover:text-white/70"
                                        )}
                                    >
                                        ! prioridad
                                    </button>
                                    {groups.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => setFilterGroupId(filterGroupId === g.id ? null : g.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 text-[10px] font-courier px-2.5 py-1 rounded-full border transition-all",
                                                filterGroupId === g.id ? "border-white/20 bg-white/5 text-white" : "border-white/5 text-white/45 hover:text-white/70"
                                            )}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                                            {g.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Task list */}
                            {pendingTasks.length === 0 && sortedTasks.filter(t => t.completed).length === 0 ? (
                                <p className="font-cormorant italic text-white/15 text-center text-xl py-12">página en blanco</p>
                            ) : (
                                <div className="space-y-0">
                                    <AnimatePresence>
                                        {groupedTasks.map(({ groupId, tasks: groupTasks }) => {
                                            const grp = groups.find(g => g.id === groupId);
                                            return (
                                                <div key={groupId || '_null'} className="mb-4">
                                                    {grp && !filterGroupId && (
                                                        <div className="flex items-center gap-2 mb-2 mt-4">
                                                            <span className="w-2 h-2 rounded-full" style={{ background: grp.color }} />
                                                            <span className="text-[10px] font-courier uppercase tracking-widest" style={{ color: grp.color + '99' }}>
                                                                {grp.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {groupTasks.map(task => (
                                                        <TaskItem
                                                            key={task.id}
                                                            task={task}
                                                            groups={groups}
                                                            soundEnabled={soundEnabled}
                                                            isAccion={isAccion}
                                                            onToggle={() => toggleTask(task.id)}
                                                            onUpdate={upd => updateTask(task.id, upd)}
                                                            onDelete={() => removeTask(task.id)}
                                                            onCreateGroup={addGroup}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Footer */}
                            {tasks.length > 0 && (
                                <div className="border-t border-white/5 pt-4 mt-6">
                                    <p className="text-[10px] font-courier text-white/15">
                                        {pendingTasks.length} pendiente{pendingTasks.length !== 1 ? 's' : ''}{doneToday > 0 ? ` · ${doneToday} completada${doneToday !== 1 ? 's' : ''} hoy` : ''}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── HOY VIEW ── */}
                    {view === 'hoy' && (
                        <motion.div
                            key="hoy"
                            initial={{ opacity: 0, y: 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 7 }}
                            transition={{ duration: 0.26 }}
                        >
                            {todayTasks.length === 0 ? (
                                <p className="font-cormorant italic text-white/15 text-center text-xl py-12">nada por hoy · descansa</p>
                            ) : (
                                <div>
                                    <AnimatePresence>
                                        {todayTasks.map(task => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                groups={groups}
                                                soundEnabled={soundEnabled}
                                                isAccion={isAccion}
                                                onToggle={() => toggleTask(task.id)}
                                                onUpdate={upd => updateTask(task.id, upd)}
                                                onDelete={() => removeTask(task.id)}
                                                onCreateGroup={addGroup}
                                            />
                                        ))}
                                    </AnimatePresence>
                                    <div className="border-t border-white/5 pt-4 mt-4">
                                        <p className="text-[10px] font-courier text-white/15">{todayTasks.length} tarea{todayTasks.length !== 1 ? 's' : ''} para hoy</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── DIARIO VIEW ── */}
                    {view === 'diario' && (
                        <motion.div
                            key="diario"
                            initial={{ opacity: 0, y: 7 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 7 }}
                            transition={{ duration: 0.26 }}
                        >
                            <DiaryView
                                notes={notes}
                                soundEnabled={soundEnabled}
                                isAccion={isAccion}
                                onAdd={addNote}
                                onUpdate={updateNote}
                                onDelete={removeNote}
                            />
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
