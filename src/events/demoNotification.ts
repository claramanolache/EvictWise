import { Platform } from 'react-native';

export type DemoNotificationResult = 'sent' | 'preview' | 'denied' | 'failed' | 'cancelled';

// Called directly from the tutorial's Next/Back press so browser permission
// requests retain the user gesture. No real deadline is created or cancelled.
export async function sendDemoNotification(title: string, body: string, isActive: () => boolean): Promise<DemoNotificationResult> {
  try {
    if (!isActive()) return 'cancelled';
    if (Platform.OS === 'web') {
      if (typeof Notification === 'undefined' || !globalThis.isSecureContext) return 'preview';
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission() : Notification.permission;
      if (!isActive()) return 'cancelled';
      if (permission !== 'granted') return 'denied';
      new Notification(title, { body, tag: 'evictwise-tutorial-demo', silent: false });
      return 'sent';
    }
    const Notifications = await import('expo-notifications');
    const { requestNotificationPermissions } = await import('./notifications');
    if (!isActive()) return 'cancelled';
    const granted = await requestNotificationPermissions(false);
    if (!isActive()) return 'cancelled';
    if (!granted) return 'denied';
    Notifications.setNotificationHandler({ handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }) });
    await Notifications.scheduleNotificationAsync({
      identifier: 'evictwise-tutorial-demo',
      content: { title, body, sound: 'default', data: { demo: true, source: 'guided-tour' } },
      trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
    });
    return 'sent';
  } catch { return 'failed'; }
}
