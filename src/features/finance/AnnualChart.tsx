import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { addMonths } from 'date-fns';
import { useFinanceStore } from './useFinanceStore';
import { DailyProjectionEngine } from './DailyProjectionEngine';
import { cn } from '../../utils/cn';

interface AnnualChartProps {
    fmtCur: (n: number) => string;
}

interface MonthData {
    month: string;
    fullMonth: string;
    balance: number;
    income: number;
    expense: number;
    isPast: boolean;
    isCurrent: boolean;
    monthIndex: number;
}

const MONTH_ABBREVS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function CustomTooltip({ active, payload, fmtCur }: { active?: boolean; payload?: any[]; label?: string; fmtCur: (n: number) => string }) {
    if (!active || !payload || payload.length === 0) return null;
    const d: MonthData = payload[0]?.payload;
    if (!d) return null;
    const bal = d.balance;
    const isNeg = bal < 0;

    return (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 shadow-2xl min-w-[160px]">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">{d.fullMonth}</p>
            <p className={cn('text-xl font-mono font-bold mb-2', isNeg ? 'text-rose-400' : 'text-emerald-400')}>
                {fmtCur(bal)}
            </p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-emerald-500 font-medium">Ingresos</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{fmtCur(d.income)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-rose-500 font-medium">Gastos</span>
                    <span className="text-[10px] text-rose-400 font-mono">{fmtCur(d.expense)}</span>
                </div>
            </div>
        </div>
    );
}

export function AnnualChart({ fmtCur }: AnnualChartProps) {
    const { config, events, overrides, realExpenses } = useFinanceStore();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    const monthData: MonthData[] = useMemo(() => {
        // Walk from cycleStartYearMonth (or Jan of current year) to Jan of current year
        // to compute the correct starting balance for Jan 1 of current year.
        const fallbackStart = `${currentYear}-01`;
        const cycleStart = config.cycleStartYearMonth ?? fallbackStart;

        let [cyStr, cmStr] = cycleStart.split('-');
        let walkYear = parseInt(cyStr, 10);
        let walkMonth = parseInt(cmStr, 10) - 1; // 0-indexed

        const janOfYear = new Date(currentYear, 0, 1);

        // If cycle starts after Jan of current year, we start from Jan anyway
        const cycleDate = new Date(walkYear, walkMonth, 1);
        if (cycleDate > janOfYear) {
            walkYear = currentYear;
            walkMonth = 0;
        }

        let runningBalance = config.initialBalance;

        // Walk month-by-month from cycleStart up to (but not including) Jan of current year
        while (walkYear < currentYear || (walkYear === currentYear && walkMonth < 0)) {
            const days = DailyProjectionEngine.generateMonthProjection(
                walkYear,
                walkMonth,
                config,
                events,
                overrides,
                realExpenses,
                runningBalance
            );
            if (days.length > 0) {
                runningBalance = days[days.length - 1].balance;
            }
            const next = addMonths(new Date(walkYear, walkMonth, 1), 1);
            walkYear = next.getFullYear();
            walkMonth = next.getMonth();
        }

        // Now walkYear === currentYear and walkMonth === 0 (Jan)
        // But we need startBalance for Jan, which is runningBalance right now
        // unless the cycle started at or after Jan this year, in which case it's config.initialBalance

        const data: MonthData[] = [];
        let startBalance = runningBalance;

        for (let m = 0; m < 12; m++) {
            const days = DailyProjectionEngine.generateMonthProjection(
                currentYear,
                m,
                config,
                events,
                overrides,
                realExpenses,
                startBalance
            );

            const endBalance = days.length > 0 ? days[days.length - 1].balance : startBalance;
            const totalIncome = days.reduce((s, d) => s + d.income, 0);
            const totalExpense = days.reduce((s, d) => s + d.totalExpense, 0);

            data.push({
                month: MONTH_ABBREVS[m],
                fullMonth: MONTH_FULL[m],
                balance: Math.round(endBalance),
                income: Math.round(totalIncome),
                expense: Math.round(totalExpense),
                isPast: m < currentMonth,
                isCurrent: m === currentMonth,
                monthIndex: m,
            });

            startBalance = endBalance;
        }

        return data;
    }, [config, events, overrides, realExpenses, currentYear, currentMonth]);

    const balances = monthData.map((d) => d.balance);
    const allNonNegative = balances.every((b) => b >= 0);
    const allNegative = balances.every((b) => b < 0);

    const gradientOffset = () => {
        if (allNonNegative) return 1;
        if (allNegative) return 0;
        const max = Math.max(...balances);
        const min = Math.min(...balances);
        return max / (max - min);
    };
    const off = gradientOffset();

    const bestMonth = monthData.reduce((a, b) => (b.balance > a.balance ? b : a), monthData[0]);
    const worstMonth = monthData.reduce((a, b) => (b.balance < a.balance ? b : a), monthData[0]);
    const avgIncome = monthData.length > 0 ? Math.round(monthData.reduce((s, d) => s + d.income, 0) / 12) : 0;

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-white">Proyección Anual</span>
                        <span className="ml-2 text-sm text-neutral-500">{currentYear}</span>
                    </div>
                </div>
                <span className="text-[10px] font-semibold text-neutral-500 bg-white/5 border border-white/[0.07] rounded-full px-2.5 py-1 tracking-wider uppercase">
                    12 meses
                </span>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                        <linearGradient id="annualFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#10b981" stopOpacity={0.30} />
                            <stop offset={off} stopColor="#f43f5e" stopOpacity={0.30} />
                        </linearGradient>
                        <linearGradient id="annualStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#34d399" stopOpacity={1} />
                            <stop offset={off} stopColor="#fb7185" stopOpacity={1} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid vertical={false} stroke="#ffffff10" strokeDasharray="0" />

                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={({ x, y, payload, index }) => {
                            const d = monthData[index];
                            const isCur = d?.isCurrent;
                            return (
                                <text
                                    x={x}
                                    y={y + 10}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fontWeight={isCur ? 700 : 400}
                                    fill={isCur ? '#a3e635' : '#737373'}
                                >
                                    {payload.value}
                                </text>
                            );
                        }}
                    />

                    <YAxis hide domain={['auto', 'auto']} />

                    <Tooltip
                        content={(props) => (
                            <CustomTooltip
                                active={props.active}
                                payload={props.payload as any[]}
                                label={props.label as string}
                                fmtCur={fmtCur}
                            />
                        )}
                        cursor={{ stroke: '#ffffff15', strokeWidth: 1 }}
                    />

                    <ReferenceLine y={0} stroke="#ffffff20" strokeDasharray="4 4" />

                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="url(#annualStroke)"
                        fill="url(#annualFill)"
                        strokeWidth={2}
                        dot={(props) => {
                            const { cx, cy, index } = props;
                            const d = monthData[index];
                            if (!d?.isCurrent) return <g key={`dot-${index}`} />;
                            return (
                                <g key={`dot-${index}`}>
                                    <circle cx={cx} cy={cy} r={5} fill="#a3e635" stroke="#0a0a0a" strokeWidth={2} />
                                </g>
                            );
                        }}
                        activeDot={{ r: 5, fill: '#34d399', stroke: '#0a0a0a', strokeWidth: 2 }}
                        animationDuration={1200}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Summary chips */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <p className="text-[9px] font-semibold text-emerald-500/70 uppercase tracking-wider mb-1">Mejor mes</p>
                    <p className="text-xs font-bold text-emerald-400 truncate">{bestMonth.fullMonth}</p>
                    <p className="text-[10px] font-mono text-emerald-400/70 truncate">{fmtCur(bestMonth.balance)}</p>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
                    <p className="text-[9px] font-semibold text-rose-500/70 uppercase tracking-wider mb-1">Peor mes</p>
                    <p className="text-xs font-bold text-rose-400 truncate">{worstMonth.fullMonth}</p>
                    <p className="text-[10px] font-mono text-rose-400/70 truncate">{fmtCur(worstMonth.balance)}</p>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <p className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Ingreso medio</p>
                    <p className="text-xs font-bold text-neutral-300 truncate">Por mes</p>
                    <p className="text-[10px] font-mono text-neutral-400 truncate">{fmtCur(avgIncome)}</p>
                </div>
            </div>
        </div>
    );
}
