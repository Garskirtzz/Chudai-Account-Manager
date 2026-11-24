import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/shell/AppShell'
import { AkunPage } from '@/pages/akun/AkunPage'
import { ServerPage } from '@/pages/server/ServerPage'
import { RiwayatPage } from '@/pages/riwayat/RiwayatPage'
import { MonitorPage } from '@/pages/monitor/MonitorPage'
import { VersiPage } from '@/pages/versi/VersiPage'
import { FlagPage } from '@/pages/flag/FlagPage'
import { PengaturanPage } from '@/pages/pengaturan/PengaturanPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))

function LandingRedirect() {
  return <Navigate to="/accounts" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/overview" element={<Navigate to="/accounts" replace />} />
        <Route path="/accounts" element={<AkunPage />} />
        <Route path="/dashboard" element={<Suspense fallback={null}><DashboardPage /></Suspense>} />
        <Route path="/servers" element={<ServerPage />} />
        <Route path="/history" element={<RiwayatPage />} />
        <Route path="/client-versions" element={<VersiPage />} />
        <Route path="/fast-flags" element={<FlagPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/settings" element={<PengaturanPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
