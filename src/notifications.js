import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const LOCATION_TASK = 'MEMORY5_LOCATION_TASK';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestPermissions = async () => {
  const { status: notifStatus } = await Notifications.requestPermissionsAsync();
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  let bgGranted = false;
  if (fgStatus === 'granted') {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    bgGranted = bgStatus === 'granted';
  }
  return {
    notifications: notifStatus === 'granted',
    locationFg: fgStatus === 'granted',
    locationBg: bgGranted,
  };
};

export const sendNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 ${title}`,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && {
          vibrationPattern: [0, 250, 250, 250],
          color: '#4f73ff',
        }),
      },
      trigger: { seconds: 1 },
    });
  } catch (e) {
    console.warn('sendNotification error', e);
  }
};

export const scheduleTimeNotification = async (event) => {
  if (!event.triggerTime) return null;
  try {
    const triggerDate = new Date(event.triggerTime);
    if (triggerDate <= new Date()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Memory 5: ${event.title}`,
        body: event.note || 'Time to act on this reminder!',
        data: { eventId: event.id },
        sound: true,
      },
      trigger: { date: triggerDate },
    });
    return id;
  } catch (e) {
    console.warn('scheduleTimeNotification error', e);
    return null;
  }
};

export const cancelNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
};

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) { console.warn('Location task error', error); return; }
  if (!data) return;
  const { locations } = data;
  if (!locations || locations.length === 0) return;
  const { latitude, longitude } = locations[0].coords;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem('m5_events');
    if (!raw) return;
    const events = JSON.parse(raw);
    for (const ev of events) {
      if (!ev.active) continue;
      if (ev.type !== 'prox' && ev.type !== 'cat') continue;
      if (ev.triggered) continue;
      if (!ev.lat || !ev.lng) continue;
      const R = 6371000;
      const dLat = ((ev.lat - latitude) * Math.PI) / 180;
      const dLon = ((ev.lng - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((latitude * Math.PI) / 180) *
        Math.cos((ev.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist <= ev.radius) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Memory 5: ${ev.title}`,
            body: ev.type === 'cat'
              ? `${ev.amenity} nearby — ${ev.note || 'You have a reminder here!'}`
              : `Within ${ev.radius}m — ${ev.note || 'You have a reminder here!'}`,
            data: { eventId: ev.id },
            sound: true,
          },
          trigger: { seconds: 1 },
        });
        const updated = events.map(e =>
          e.id === ev.id ? { ...e, triggered: true } : e
        );
        await AsyncStorage.setItem('m5_events', JSON.stringify(updated));
      }
    }
  } catch (e) {
    console.warn('Location task processing error', e);
  }
});

export const startLocationTracking = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 20,
        timeInterval: 30000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Memory 5 is watching for nearby pins',
          notificationBody: 'Tap to open the app',
          notificationColor: '#4f73ff',
        },
      });
    }
  } catch (e) {
    console.warn('startLocationTracking error', e);
  }
};

export const stopLocationTracking = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {}
};
