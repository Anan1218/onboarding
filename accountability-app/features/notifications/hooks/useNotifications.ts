import { useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { notificationService } from '../services/notificationService';

interface NotificationData {
  goalId?: string;
  type?: string;
}

function isValidNotificationData(data: unknown): data is NotificationData {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return true;
}

export function useNotifications(): void {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      if (!isValidNotificationData(data)) {
        return;
      }

      // Navigate based on notification type
      if (data.goalId !== undefined && typeof data.goalId === 'string') {
        router.push(`/goal/${data.goalId}`);
      }
    },
    [router]
  );

  useEffect(() => {
    // Request permissions on mount
    void notificationService.requestPermissions();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Could be used for in-app notification handling
      console.log('Notification received:', notification.request.content.title);
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current !== null) {
        notificationListener.current.remove();
      }
      if (responseListener.current !== null) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse]);
}
