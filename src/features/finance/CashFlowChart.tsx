
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CashFlowChartProps {
    data: any[]; // DayProjection[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
    // Calculate the gradient offset to split Green (Positive) and Red (Negative)
    const gradientOffset = () => {
        const dataMax = Math.max(...data.map((i) => i.balance));
        const dataMin = Math.min(...data.map((i) => i.balance));

        if (dataMax <= 0) {
            return 0;
        }
        if (dataMin >= 0) {
            return 1;
        }

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    return (
        <div className="w-full h-[300px] bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-6 left-6 z-10">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ola de Flujo de Caja</h3>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset={off} stopColor="#f43f5e" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#34d399" stopOpacity={1} />
                            <stop offset={off} stopColor="#fb7185" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        tickFormatter={(str) => format(parseISO(str), 'd', { locale: es })}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                        interval={2}
                    />
                    <YAxis
                        hide
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const val = payload[0].value as number;
                                return (
                                    <div className="bg-[#111] border border-white/10 rounded-xl p-3 shadow-xl">
                                        <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">
                                            {format(parseISO(label), 'd MMM', { locale: es })}
                                        </p>
                                        <p className={`text-lg font-mono font-bold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {val.toLocaleString('de-DE')}€
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <ReferenceLine y={0} stroke="#404040" strokeDasharray="3 3" />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="url(#splitStroke)"
                        fill="url(#splitColor)"
                        strokeWidth={3}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
