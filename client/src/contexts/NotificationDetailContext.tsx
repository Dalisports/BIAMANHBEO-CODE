import { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationData {
  id: string;
  type: "order" | "kitchen" | "payment";
  title: string;
  subtitle?: string;
  items?: string[];
  tableNumber?: string;
  username?: string;
  timestamp: Date;
  body?: string;
}

interface NotificationDetailContextType {
  isDetailModalVisible: boolean;
  selectedNotification: NotificationData | null;
  showNotificationDetail: (notification: NotificationData) => void;
  hideNotificationDetail: () => void;
}

const NotificationDetailContext = createContext<NotificationDetailContextType | undefined>(undefined);

export function useNotificationDetail() {
  const context = useContext(NotificationDetailContext);
  if (!context) {
    throw new Error('useNotificationDetail must be used within NotificationDetailProvider');
  }
  return context;
}

export function NotificationDetailProvider({ children }: { children: ReactNode }) {
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);

  const showNotificationDetail = (notification: NotificationData) => {
    setSelectedNotification(notification);
    setIsDetailModalVisible(true);
  };

  const hideNotificationDetail = () => {
    setIsDetailModalVisible(false);
    setSelectedNotification(null);
  };

  return (
    <NotificationDetailContext.Provider
      value={{
        isDetailModalVisible,
        selectedNotification,
        showNotificationDetail,
        hideNotificationDetail,
      }}
    >
      {children}
    </NotificationDetailContext.Provider>
  );
}