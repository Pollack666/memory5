import AsyncStorage from '@react-native-async-storage/async-storage';

export const uid = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const friendCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (metres) => {
  if (metres === Infinity || metres > 100000) return null;
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
};

export const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
};

export const fmtTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

export const fmtDateTime = (iso) => {
  const d = fmtDate(iso);
  const t = fmtTime(iso);
  return d && t ? `${d} at ${t}` : d || t || '';
};

const KEY = (k) => `m5_${k}`;

export const Storage = {
  get: async (k) => {
    try {
      const v = await AsyncStorage.getItem(KEY(k));
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set: async (k, v) => {
    try {
      await AsyncStorage.setItem(KEY(k), JSON.stringify(v));
    } catch (e) { console.warn('Storage.set error', e); }
  },
  remove: async (k) => {
    try { await AsyncStorage.removeItem(KEY(k)); } catch {}
  },
  clear: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const m5keys = keys.filter(k => k.startsWith('m5_'));
      await AsyncStorage.multiRemove(m5keys);
    } catch {}
  },
};
