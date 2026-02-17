import { motion } from 'framer-motion';
// import { useTranslation } from 'react-i18next';

interface MomentumPanelProps {
    currentLevel: string; // e.g. "Estabilidad"
    nextLevel: string; // e.g. "Momentum"
    streak: number; // weeks or days
    congruence: number;
}

export function MomentumPanel({ currentLevel, nextLevel, streak, congruence }: MomentumPanelProps) {
    // const { t } = useTranslation();

    return (
        <div className="w-full max-w-md mx-auto mt-8 p-6 rounded-3xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-secondary rounded-full">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /></svg>
                    </div>
                    <h3 className="font-semibold text-lg">Camino al siguiente nivel</h3>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                    {currentLevel}
                </span>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
                Ve qué te falta para subir de etapa.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-secondary/30 p-4 rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Nivel Actual</span>
                    <span className="font-bold">{currentLevel}</span>
                </div>
                <div className="bg-secondary/30 p-4 rounded-xl opacity-50">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Siguiente Nivel</span>
                    <span className="font-bold text-primary">{nextLevel}</span>
                </div>
            </div>

            <div className="mb-2 flex items-center gap-2 text-yellow-500 font-medium">
                <span>⚡</span>
                <span>Semanas consecutivas: {streak}</span>
            </div>

            {/* Progress Bar for level transition */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mb-4">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, congruence)}%` }}
                    transition={{ duration: 1 }}
                />
            </div>

            <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary">↗</span>
                    <span className="font-medium">Te faltan {2 - streak > 0 ? 2 - streak : 0} semanas congruentes para llegar a {nextLevel}.</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                    Para que esta semana cuente, necesitas llegar al 80% de congruencia.
                </p>
            </div>

        </div>
    );
}
