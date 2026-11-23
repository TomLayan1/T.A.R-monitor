import { NotificationWatcher } from './components/shared/NotificationWatcher';
import { DemoClockPanel } from './components/shared/DemoClockPanel';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { SharedDataProvider } from './context/SharedDataContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <SharedDataProvider>
        <ToastProvider>
          <AppRoutes />
          <NotificationWatcher />
          <DemoClockPanel />
        </ToastProvider>
      </SharedDataProvider>
    </AuthProvider>
  );
}
