import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Result } from '@/shared/types/common.types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<Result<boolean>> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return { success: true, data: false };
      }

      // Configure for iOS
      if (Platform.OS === 'ios') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      return { success: true, data: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permissions';
      return { success: false, error: new Error(message) };
    }
  },

  async scheduleDeadlineReminder(
    goalId: string,
    goalTitle: string,
    deadline: Date
  ): Promise<Result<string>> {
    try {
      // Schedule reminder 1 hour before deadline
      const reminderTime = new Date(deadline);
      reminderTime.setHours(reminderTime.getHours() - 1);

      // Only schedule if reminder time is in the future
      if (reminderTime <= new Date()) {
        return { success: true, data: '' };
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Goal Deadline Approaching!',
          body: `Your goal "${goalTitle}" is due in 1 hour. Submit your proof now!`,
          data: { goalId, type: 'deadline_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
      });

      return { success: true, data: identifier };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule notification';
      return { success: false, error: new Error(message) };
    }
  },

  async scheduleFailureNotification(
    goalId: string,
    goalTitle: string,
    deadline: Date
  ): Promise<Result<string>> {
    try {
      // Schedule notification 1 minute after deadline (simulating failure)
      const failureTime = new Date(deadline);
      failureTime.setMinutes(failureTime.getMinutes() + 1);

      // Only schedule if failure time is in the future
      if (failureTime <= new Date()) {
        return { success: true, data: '' };
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Goal Failed',
          body: `You missed the deadline for "${goalTitle}". Don't give up - try again!`,
          data: { goalId, type: 'goal_failed' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: failureTime,
        },
      });

      return { success: true, data: identifier };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule notification';
      return { success: false, error: new Error(message) };
    }
  },

  async sendImmediateNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<Result<string>> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Send immediately
      });

      return { success: true, data: identifier };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send notification';
      return { success: false, error: new Error(message) };
    }
  },

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },
};
