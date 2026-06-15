import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalendarEvent } from './events';

// --- Permission Handling ---
export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('You need to enable notifications in your settings.');
    return false;
  }
  return true;
}

// --- Notification Scheduling Logic ---

/**
 * Schedules notifications for a single event at specified intervals.
 * @param event The calendar event to schedule notifications for.
 */
const scheduleNotificationsForEvent = async (event: CalendarEvent) => {
  const now = new Date();
  const eventDate = event.date;

  // --- Schedule for Today (if the event is today and in the future) ---
  if (isSameDay(eventDate, now) && eventDate.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Today: ${event.title}`,
        body: event.desc,
        data: { eventId: event.title }, // You can use an ID here
      },
      trigger: {
        date: eventDate, // Schedules it for the exact time of the event
      },
    });
    console.log(`Scheduled 'Today' notification for: ${event.title}`);
  }

  // --- Schedule for One Day Before ---
  const oneDayBefore = new Date(eventDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);

  if (oneDayBefore.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Tomorrow: ${event.title}`,
        body: event.desc,
        data: { eventId: event.title },
      },
      trigger: {
        date: oneDayBefore,
      },
    });
    console.log(`Scheduled 'One Day Away' notification for: ${event.title}`);
  }

  // --- Schedule for One Week Before ---
  const oneWeekBefore = new Date(eventDate);
  oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

  if (oneWeekBefore.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `In one week: ${event.title}`,
        body: event.desc,
        data: { eventId: event.title },
      },
      trigger: {
        date: oneWeekBefore,
      },
    });
    console.log(`Scheduled 'One Week Away' notification for: ${event.title}`);
  }
};

/**
 * Main function to clear all previous notifications and schedule new ones for all events.
 * @param events An array of CalendarEvent objects.
 */
export const scheduleAllEventNotifications = async (events: CalendarEvent[]) => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  // 1. Cancel all previously scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("Cancelled all previous notifications.");

  // 2. Schedule new notifications for each event
  for (const event of events) {
    await scheduleNotificationsForEvent(event);
  }
  console.log("Finished scheduling all event notifications.");
};


// --- Helper Functions ---
const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};
