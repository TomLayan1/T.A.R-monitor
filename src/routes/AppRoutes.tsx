import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ManagementDashboard } from '../components/management/dashboard/ManagementDashboard';
import { ManagementLayout } from '../components/management/layout/ManagementLayout';
import { ManagementNotificationsPage } from '../components/management/notifications/ManagementNotificationsPage';
import { OutstandingSubmissionsPage } from '../components/management/notifications/OutstandingSubmissionsPage';
import { PendingApprovalsPage } from '../components/management/pending-approvals/PendingApprovalsPage';
import { RmaPerformancePage } from '../components/management/rma-performance/RmaPerformancePage';
import { ManagementStationsPage } from '../components/management/stations/ManagementStationsPage';
import { OutstandingStationsPage } from '../components/management/stations/OutstandingStationsPage';
import { PublicLayout } from '../components/public/PublicLayout';
import { RmaNotificationsPage } from '../components/rma/notifications/RmaNotificationsPage';
import { ReportsWorkspace } from '../components/shared/ReportsWorkspace';
import { StationsPage } from '../components/stations/StationsPage';
import { WeeklyLogPage } from '../components/weekly-log/WeeklyLogPage';
import { WeeklyLogsPage } from '../components/weekly-logs/WeeklyLogsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SignInPage } from '../pages/SignInPage';
import { SignUpPage } from '../pages/SignUpPage';
import { AboutPage } from '../pages/public/AboutPage';
import { HomePage } from '../pages/public/HomePage';
import { StationOnboardingPage } from '../pages/public/StationOnboardingPage';
import { GuestRoute, RoleGuard } from './guards';
import { SIGN_IN_PATH, SIGN_UP_PATH } from './paths';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/onboarding/station" element={<StationOnboardingPage />} />
      </Route>
      {/* Get Started goes straight to the unified Sign In */}
      <Route path="/get-started" element={<Navigate to={SIGN_IN_PATH} replace />} />

      {/* Unified authentication for every account type */}
      <Route path={SIGN_IN_PATH} element={<GuestRoute><SignInPage /></GuestRoute>} />
      <Route path={SIGN_UP_PATH} element={<GuestRoute><SignUpPage /></GuestRoute>} />
      {/* Old per-portal entry points */}
      {['/rma', '/management'].map((p) => (
        <Route key={p} path={p} element={<Navigate to={SIGN_IN_PATH} replace />} />
      ))}
      {['/rma/register', '/management/register'].map((p) => (
        <Route key={p} path={p} element={<Navigate to={SIGN_UP_PATH} replace />} />
      ))}

      {/* RMA portal (RMA role only) */}
      <Route element={<RoleGuard allow={['RMA']}><DashboardLayout /></RoleGuard>}>
        <Route path="/rma/dashboard" element={<DashboardOverview />} />
        <Route path="/rma/stations" element={<StationsPage />} />
        <Route path="/rma/stations/:stationId/weekly-log" element={<WeeklyLogPage />} />
        <Route path="/rma/weekly-logs" element={<WeeklyLogsPage />} />
        <Route path="/rma/reports" element={<ReportsWorkspace />} />
        <Route path="/rma/notifications" element={<RmaNotificationsPage />} />
      </Route>

      {/* Stakeholder portal: BM (own scope), Head of Retail, Risk, Management */}
      <Route element={<RoleGuard allow={['BM', 'Head of Retail', 'Risk', 'Management']}><ManagementLayout /></RoleGuard>}>
        <Route path="/management/dashboard" element={<ManagementDashboard />} />
        <Route path="/management/stations" element={<ManagementStationsPage />} />
        <Route path="/management/reports" element={<ReportsWorkspace />} />
        <Route path="/management/notifications" element={<ManagementNotificationsPage />} />
        <Route path="/management/outstanding" element={<OutstandingSubmissionsPage />} />
        <Route path="/management/outstanding-stations" element={<OutstandingStationsPage />} />
        <Route path="/management/performance" element={<RmaPerformancePage />} />
        {/* Risk only */}
        <Route element={<RoleGuard allow={['Risk']}><Outlet /></RoleGuard>}>
          <Route path="/management/approvals" element={<PendingApprovalsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
