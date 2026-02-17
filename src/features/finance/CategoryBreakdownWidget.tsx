
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface CategoryData {
    name: string;
    value: number;
    color: string;
}

interface CategoryBreakdownWidgetProps {
    totalIncome: number;
    totalExpenses: number;
    categories: CategoryData[];
    monthLabel?: string;
}

export function CategoryBreakdownWidget({ totalIncome, totalExpenses, categories, monthLabel = "Actual" }: CategoryBreakdownWidgetProps) {
    // Calculate percentages for the top bar
    const totalFlow = totalIncome + totalExpenses;
    const incomePct = totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50;
    const expensePct = totalFlow > 0 ? (totalExpenses / totalFlow) * 100 : 50;

    // Sort categories by value desc
    const sortedCategories = [...categories].sort((a, b) => b.value - a.value);
    const maxCategoryValue = Math.max(...sortedCategories.map(c => c.value), 1);

    return (
        <div className="lg:col-span-2 bg-[#050505] rounded-[24px] border border-white/10 p-8 shadow-2xl relative overflow-hidden h-full flex flex-col">
            {/* Ambient Background Effect */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-bold text-white tracking-tight">Por categorías</h3>
                <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-lg bg-white/5 text-white text-xs font-bold border border-white/10 shadow-sm">{monthLabel}</div>
                    <div className="px-3 py-1 rounded-lg bg-transparent text-neutral-500 text-xs font-bold border border-transparent hover:bg-white/5 transition-colors cursor-pointer">Pasado</div>
                </div>
            </div>

            {/* Income vs Expenses Bar */}
            <div className="mb-12 relative z-10">
                <div className="flex justify-between items-end mb-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Entradas (Income)</span>
                        <span className="text-2xl font-bold text-white font-mono tracking-tight text-shadow-glow-emerald">
                            +€{totalIncome.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Salidas (Expenses)</span>
                        <span className="text-2xl font-bold text-white font-mono tracking-tight text-shadow-glow-rose">
                            -€{totalExpenses.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* The Bar */}
                <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden flex relative">
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${incomePct}%` }} />
                    <div className="h-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" style={{ width: `${expensePct}%` }} />
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center flex-1 relative z-10">

                {/* 1. Donut Chart */}
                <div className="h-[220px] relative flex items-center justify-center">
                    {/* Glowing Ring Background */}
                    <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-3xl transform scale-75" />

                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sortedCategories}
                                innerRadius={65}
                                outerRadius={80}
                                paddingAngle={6} // Increased spacing for modern look
                                cornerRadius={4} // Rounded ends
                                dataKey="value"
                                stroke="none"
                            >
                                {sortedCategories.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        className="drop-shadow-lg"
                                        stroke="rgba(0,0,0,0.5)"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Middle Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-white tracking-tighter drop-shadow-md">
                            {/* Roughly Expense Ratio or Biggest Category %? Image says 76%. Let's calculate expense ratio vs income? */}
                            {totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 100}%
                        </span>
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Ratio</span>
                    </div>
                </div>

                {/* 2. Category List */}
                <div className="space-y-5">
                    {sortedCategories.map(cat => (
                        <div key={cat.name} className="flex flex-col gap-1.5 group">
                            {/* Top Row: Name and Amount */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: cat.color, color: cat.color }} />
                                    <span className="text-xs font-bold text-neutral-300 group-hover:text-white transition-colors">
                                        {cat.name}
                                    </span>
                                </div>
                                <span className="text-sm font-bold font-mono text-white">
                                    {cat.value.toLocaleString()}€
                                </span>
                            </div>

                            {/* Progress Bar Row */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                                        style={{
                                            width: `${(cat.value / maxCategoryValue) * 100}%`,
                                            backgroundColor: cat.color,
                                            boxShadow: `0 0 10px ${cat.color}40`
                                        }}
                                    />
                                </div>
                                {/* Percentage of Total Expenses */}
                                <span className="text-[9px] font-medium text-neutral-600 w-8 text-right">
                                    {Math.round((cat.value / totalExpenses) * 100)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
