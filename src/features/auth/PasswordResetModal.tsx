import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * Aparece al abrir el enlace de "¿Olvidaste tu contraseña?". Supabase ya
 * inició la sesión con ese enlace; sólo falta elegir la contraseña nueva.
 */
export function PasswordResetModal() {
    const { recovering, finishRecovery } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    if (!recovering) return null;

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 8) return setError('Usa al menos 8 caracteres.');
        if (password !== confirm) return setError('Las dos contraseñas no coinciden.');
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) return setError(error.message);
        setDone(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6">
                {done ? (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">Listo</h2>
                        <p className="text-sm text-neutral-400">
                            Tu contraseña nueva ya funciona. Úsala para entrar en la app de la Mac y del iPhone.
                        </p>
                        <button
                            onClick={finishRecovery}
                            className="w-full py-3 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-colors"
                        >
                            Seguir
                        </button>
                    </div>
                ) : (
                    <form onSubmit={save} className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Contraseña nueva</h2>
                            <p className="text-sm text-neutral-500">Al menos 8 caracteres. Elige una que puedas recordar.</p>
                        </div>
                        <input
                            type="password"
                            autoFocus
                            autoComplete="new-password"
                            placeholder="Contraseña nueva"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400/50"
                        />
                        <input
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repítela"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400/50"
                        />
                        {error && <p className="text-sm text-rose-400">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-cyan-400 text-black font-bold hover:bg-cyan-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Guardar contraseña
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
