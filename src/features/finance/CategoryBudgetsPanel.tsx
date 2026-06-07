import { useState, useRef, useEffect } from 'react';
import { Tag } from 'lucide-react';
import { useFinanceStore } from './useFinanceStore';
import { cn } from '../../utils/cn';

interface CategoryBudgetsPanelProps {
    currentMonthSpending: Record<string, number>;
    fmtCur: (n: number) => string;
}

function extractEmoji(category: string): string {
    const match = category.match(/^\p{Emoji}/u);
    return match ? match[0] : '•';
}

function extractLabel(category: string): string {
    return category.replace(/^\p{Emoji}\s*/u, '').trim();
}

function ProgressBar({ spent, limit }: { spent: number; limit: number }) {
    const pct = Math.min((spent / limit) * 100, 100);
    const over = spent > limit;
    const near = pct >= 80 && !over;

    return (
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
                className={cn(
                    'h-full rounded-full transition-all duration-500',
                    over ? 'bg-rose-500' : near ? 'bg-amber-400' : 'bg-emerald-500'
                )}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

interface InlineEditorProps {
    initialValue: number;
    onSave: (value: number) => void;
    onCancel: () => void;
}

function InlineEditor({ initialValue, onSave, onCancel }: InlineEditorProps) {
    const [raw, setRaw] = useState(initialValue > 0 ? String(initialValue) : '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    function commit() {
        const n = parseFloat(raw.replace(',', '.'));
        if (!isNaN(n) && n >= 0) {
            onSave(n);
        } else {
            onCancel();
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
    }

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-20 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs font-mono text-amber-300 outline-none focus:border-amber-400/60 focus:bg-amber-500/15 transition-all"
            placeholder="0"
        />
    );
}

export function CategoryBudgetsPanel({ currentMonthSpending, fmtCur }: CategoryBudgetsPanelProps) {
    const categoryBudgets = useFinanceStore((s) => s.categoryBudgets);
    const setCategoryBudget = useFinanceStore((s) => s.setCategoryBudget);
    const [editing, setEditing] = useState<string | null>(null);

    const allCategories = Array.from(
        new Set([
            ...Object.keys(categoryBudgets).filter((c) => (categoryBudgets[c] ?? 0) > 0),
            ...Object.keys(currentMonthSpending).filter((c) => (currentMonthSpending[c] ?? 0) > 0),
        ])
    ).sort((a, b) => (currentMonthSpending[b] ?? 0) - (currentMonthSpending[a] ?? 0));

    const totalSpent = allCategories.reduce((sum, c) => sum + (currentMonthSpending[c] ?? 0), 0);
    const totalLimit = allCategories.reduce((sum, c) => sum + (categoryBudgets[c] ?? 0), 0);

    function handleSave(category: string, amount: number) {
        setCategoryBudget(category, amount);
        setEditing(null);
    }

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                    <Tag size={16} className="text-amber-400" />
                    <span className="text-sm font-semibold text-white/90">Techo por Categoría</span>
                </div>
                <span className="text-[11px] text-white/30 font-medium">click para editar límite</span>
            </div>

            {/* Body */}
            <div className="flex flex-col divide-y divide-white/[0.04] flex-1">
                {allCategories.length === 0 ? (
                    <p className="text-xs italic text-neutral-600 px-5 py-6 text-center">
                        Registrá gastos con categoría para ver el desglose
                    </p>
                ) : (
                    allCategories.map((category) => {
                        const spent = currentMonthSpending[category] ?? 0;
                        const limit = categoryBudgets[category] ?? 0;
                        const isEditing = editing === category;
                        const emoji = extractEmoji(category);
                        const label = extractLabel(category);

                        return (
                            <div
                                key={category}
                                className="group flex flex-col gap-1.5 px-5 py-3 hover:bg-white/[0.015] transition-colors"
                            >
                                {/* Top row */}
                                <div className="flex items-center gap-3">
                                    {/* Emoji */}
                                    <span className="text-base leading-none select-none shrink-0">{emoji}</span>

                                    {/* Name */}
                                    <span className="flex-1 min-w-0 text-xs font-medium text-white/75 truncate">
                                        {label}
                                    </span>

                                    {/* Spent */}
                                    <span className="text-xs font-mono font-semibold text-white/90 tabular-nums shrink-0">
                                        {fmtCur(spent)}
                                    </span>

                                    {/* Limit area */}
                                    <div className="flex items-center shrink-0">
                                        {isEditing ? (
                                            <InlineEditor
                                                initialValue={limit}
                                                onSave={(v) => handleSave(category, v)}
                                                onCancel={() => setEditing(null)}
                                            />
                                        ) : limit > 0 ? (
                                            <button
                                                onClick={() => setEditing(category)}
                                                className="text-xs font-mono text-amber-400/70 hover:text-amber-300 transition-colors"
                                                title="Editar límite"
                                            >
                                                / {fmtCur(limit)}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setEditing(category)}
                                                className="text-[11px] font-medium text-amber-500/50 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                + límite
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar (only when limit set) */}
                                {limit > 0 && (
                                    <div className="pl-7">
                                        <ProgressBar spent={spent} limit={limit} />
                                        {spent > limit && (
                                            <p className="text-[10px] text-rose-400/80 mt-0.5 tabular-nums">
                                                +{fmtCur(spent - limit)} sobre el límite
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {allCategories.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.07] bg-white/[0.01]">
                    <span className="text-xs text-white/40 font-medium">Total este mes</span>
                    <div className="flex items-center gap-1.5 tabular-nums">
                        <span
                            className={cn(
                                'text-sm font-bold',
                                totalLimit > 0 && totalSpent > totalLimit ? 'text-rose-400' : 'text-white/80'
                            )}
                        >
                            {fmtCur(totalSpent)}
                        </span>
                        {totalLimit > 0 && (
                            <>
                                <span className="text-xs text-white/25">/</span>
                                <span className="text-xs font-semibold text-amber-400/70">{fmtCur(totalLimit)}</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
