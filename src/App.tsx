
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import MainLayout from './layouts/MainLayout';
import { useAuth } from './context/AuthContext';
import './i18n/config';

// Cada página se descarga sólo cuando se entra a ella — el arranque baja de
// ~1.26 MB a un fragmento pequeño. El layout va eager porque es el marco.
const HabitsPage = lazy(() => import('./features/habits/HabitsPage'));
const FinancesPage = lazy(() => import('./features/finance/FinancesPage'));
const StatsPage = lazy(() => import('./features/stats/StatsPage'));
const IdentityPage = lazy(() => import('./features/identity/IdentityPage'));
const CoachPage = lazy(() => import('./features/coach/CoachPage'));
const ToDoPage = lazy(() => import('./features/tasks/ToDoPage'));
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'));

// Una vez pintada la primera pantalla, traemos el resto en segundo plano para
// que cambiar de sección siga siendo instantáneo.
function usePrefetchPages() {
    useEffect(() => {
        const prefetch = () => {
            import('./features/finance/FinancesPage');
            import('./features/stats/StatsPage');
            import('./features/tasks/ToDoPage');
            import('./features/identity/IdentityPage');
            import('./features/coach/CoachPage');
            import('./features/habits/HabitsPage');
        };
        const idle = (window as any).requestIdleCallback;
        if (typeof idle === 'function') {
            const id = idle(prefetch, { timeout: 3000 });
            return () => (window as any).cancelIdleCallback?.(id);
        }
        const id = window.setTimeout(prefetch, 1500);
        return () => window.clearTimeout(id);
    }, []);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const onboardingDone = localStorage.getItem('congruence_onboarding') === 'done';
    if (!onboardingDone) return <Navigate to="/onboarding" replace />;
    return <>{children}</>;
}

// Hueco neutro mientras llega el fragmento de la página. Sin spinner: el salto
// es de milisegundos y un spinner se vería peor que nada.
function PageFallback() {
    return <div className="min-h-[60vh]" />;
}

function App() {
    usePrefetchPages();

    return (
        <ThemeProvider defaultTheme="dark" storageKey="lifeos-ui-theme">
            <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
                    <Routes>
                        {/* Onboarding — no layout wrapper */}
                        <Route path="/onboarding" element={<OnboardingPage />} />

                        <Route element={<MainLayout />}>
                            <Route path="/" element={<OnboardingGuard><HabitsPage /></OnboardingGuard>} />
                            <Route path="/finances" element={<FinancesPage />} />
                            <Route path="/stats" element={<StatsPage />} />
                            <Route path="/identity" element={<IdentityPage />} />
                            <Route path="/coach" element={
                                <ProtectedRoute>
                                    <CoachPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/tasks" element={<ToDoPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
