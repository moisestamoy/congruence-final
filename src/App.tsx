
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import MainLayout from './layouts/MainLayout';
import { useAuth } from './context/AuthContext';
import './i18n/config';

import HabitsPage from './features/habits/HabitsPage';
import FinancesPage from './features/finance/FinancesPage';
import StatsPage from './features/stats/StatsPage';
import IdentityPage from './features/identity/IdentityPage';
import CoachPage from './features/coach/CoachPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/" replace />;
    return <>{children}</>;
}

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="lifeos-ui-theme">
            <BrowserRouter>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<HabitsPage />} />
                        <Route path="/finances" element={<FinancesPage />} />
                        <Route path="/stats" element={<StatsPage />} />
                        <Route path="/identity" element={<IdentityPage />} />
                        <Route path="/coach" element={
                            <ProtectedRoute>
                                <CoachPage />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
