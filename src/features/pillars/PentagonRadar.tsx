import { motion } from 'framer-motion';
import { PILLAR_IDS, PILLAR_META, PillarData, PillarId } from './usePillarsStore';

interface PentagonRadarProps {
    pillars: Record<PillarId, PillarData>;
    onSelect: (id: PillarId) => void;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 118;
const ACCENT = 'rgb(var(--accent-400))';

/** Punto del eje i a una distancia de 0 a 1 del centro. El primer eje apunta arriba. */
function point(i: number, t: number) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / PILLAR_IDS.length;
    return { x: CENTER + Math.cos(angle) * RADIUS * t, y: CENTER + Math.sin(angle) * RADIUS * t };
}

const polygon = (values: number[]) =>
    values.map((v, i) => { const p = point(i, Math.max(0, Math.min(10, v)) / 10); return `${p.x},${p.y}`; }).join(' ');

/** Los 5 pilares en un pentágono: trazo lleno = dónde estás, punteado = a dónde vas. */
export function PentagonRadar({ pillars, onSelect }: PentagonRadarProps) {
    const scoresA = PILLAR_IDS.map(id => pillars[id].scoreA);
    const scoresB = PILLAR_IDS.map(id => pillars[id].scoreB);

    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[420px]" role="img" aria-label="Tus pilares">
            {[0.25, 0.5, 0.75, 1].map(t => (
                <polygon key={t} points={PILLAR_IDS.map((_, i) => { const p = point(i, t); return `${p.x},${p.y}`; }).join(' ')}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            ))}

            {/* Crecen desde el centro al entrar. (Animar `points` directamente da NaN con un resorte.) */}
            <motion.g initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 90, damping: 16 }}
                style={{ transformOrigin: `${CENTER}px ${CENTER}px`, transformBox: 'view-box' }}>
                <polygon points={polygon(scoresB)} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} strokeDasharray="3 5" />
                <polygon points={polygon(scoresA)} fill={ACCENT} fillOpacity={0.1} stroke={ACCENT} strokeWidth={2.5} strokeLinejoin="round" />
                {PILLAR_IDS.map((id, i) => {
                    const a = point(i, pillars[id].scoreA / 10);
                    return <circle key={id} cx={a.x} cy={a.y} r={3.5} fill="#0a0a0a" stroke={ACCENT} strokeWidth={2} />;
                })}
            </motion.g>

            {/* Nombre y puntaje en cada punta: tocarlo abre ese pilar */}
            {PILLAR_IDS.map((id, i) => {
                const p = point(i, 1.26);
                return (
                    <g key={id} onClick={() => onSelect(id)} className="cursor-pointer" role="button" aria-label={`Abrir ${PILLAR_META[id].label}`}>
                        <rect x={p.x - 38} y={p.y - 18} width={76} height={36} fill="transparent" />
                        <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="rgba(255,255,255,0.55)"
                            style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            {PILLAR_META[id].label}
                        </text>
                        <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize={11} fontWeight={800} fill="white"
                            style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {pillars[id].scoreA}<tspan fill="rgba(255,255,255,0.3)" fontWeight={500}> / {pillars[id].scoreB}</tspan>
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
