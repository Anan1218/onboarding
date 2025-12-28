import type { JSX, ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps): JSX.Element {
  // Initialize notification listeners
  useNotifications();

  return <>{children}</>;
}
