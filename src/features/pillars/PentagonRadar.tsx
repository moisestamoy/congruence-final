import { PILLAR_IDS, PILLAR_META, PillarData, PillarId } from './usePillarsStore';

interface PentagonRadarProps {
    pillars: Record<PillarId, PillarData>;
    onSelect: (id: PillarId) => void;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 112;

/** Punto del eje i a una distancia de 0 a 1 del centro. El primer eje apunta arriba. */
function point(i: number, t: number) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / PILLAR_IDS.length;
    return { x: CENTER + Math.cos(angle) * RADIUS * t, y: CENTER + Math.sin(angle) * RADIUS * t };
}

const polygon = (values: number[]) =>
    values.map((v, i) => { const p = point(i, Math.max(0, Math.min(10, v)) / 10); return `${p.x},${p.y}`; }).join(' ');

/** Pentágono de los 5 pilares: sólido = dónde estás (A), punteado = a dónde vas (B). */
export function PentagonRadar({ pillars, onSelect }: PentagonRadarProps) {
    const scoresA = PILLAR_IDS.map(id => pillars[id].scoreA);
    const scoresB = PILLAR_IDS.map(id => pillars[id].scoreB);

    return (
        <div className="flex flex-col items-center">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[340px]" role="img" aria-label="Radar de tus pilares">
                {/* Rejilla */}
                {[0.2, 0.4, 0.6, 0.8, 1].map(t => (
                    <polygon
                        key={t}
                        points={PILLAR_IDS.map((_, i) => { const p = point(i, t); return `${p.x},${p.y}`; }).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth={1}
                    />
                ))}
                {PILLAR_IDS.map((_, i) => {
                    const p = point(i, 1);
                    return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />;
                })}

                {/* Punto B: a dónde vas */}
                <polygon points={polygon(scoresB)} fill="rgba(52,211,153,0.04)" stroke="rgb(52,211,153)" strokeOpacity={0.7}
                    strokeWidth={1.5} strokeDasharray="5 5" />
                {/* Punto A: dónde estás */}
                <polygon points={polygon(scoresA)} fill="rgba(129,140,248,0.18)" stroke="rgb(129,140,248)" strokeWidth={2} strokeLinejoin="round" />

                {/* Vértices: tocar uno abre su tarjeta */}
                {PILLAR_IDS.map((id, i) => {
                    const meta = PILLAR_META[id];
                    const a = point(i, pillars[id].scoreA / 10);
                    const label = point(i, 1.24);
                    return (
                        <g key={id} onClick={() => onSelect(id)} className="cursor-pointer" role="button" aria-label={`Abrir pilar ${meta.label}`}>
                            <circle cx={a.x} cy={a.y} r={5} fill={meta.color} />
                            <circle cx={label.x} cy={label.y} r={24} fill="transparent" />
                            <text x={label.x} y={label.y - 4} textAnchor="middle" fontSize={15}>{meta.emoji}</text>
                            <text x={label.x} y={label.y + 13} textAnchor="middle" fontSize={10} fontWeight={700}
                                fill="rgb(163,163,163)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {meta.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <div className="flex items-center gap-5 text-[10px] font-bold uppercase tracking-widest text-neutral-500 -mt-2">
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-400 rounded-full" />Punto A · hoy</span>
                <span className="flex items-center gap-1.5"><span className="w-4 border-t border-dashed border-emerald-400" />Punto B · meta</span>
            </div>
        </div>
    );
}
