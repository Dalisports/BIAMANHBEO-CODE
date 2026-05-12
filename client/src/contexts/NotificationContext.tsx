import { createContext, useContext, ReactNode } from 'react';
import { useBatchNotification } from '@/hooks/use-batch-notification';

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContext = createContext<ReturnType<typeof useBatchNotification> | null>(null);

export function NotificationProvider({ children }: NotificationProviderProps) {
  const batchNotification = useBatchNotification({
    debounceMs: 1500,
    maxEvents: 10,
  });

  return (
    <NotificationContext.Provider value={batchNotification}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}