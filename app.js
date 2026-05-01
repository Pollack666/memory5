import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { C, SEED_EVENTS } from './src/constants';
import { Storage, getDistance } from './src/helpers';
import { ToastBanner } from './src/components';
import {
  requestPermissions,
  startLocationTracking,
  sendNotification,
} from './src/notifications';
import {
  OnboardingScreen,
  MapScreen,
  EventsScreen,
  AddEditScreen,
  DetailScreen,
  FriendsScreen,
  ProfileScreen,
} from './src/screens';

const NAV = [
  { id:'map',     label:'Map',     emoji:'🗺️' },
  { id:'events',  label:'Events',  emoji:'📋' },
  { id:'add',     label:'Add',     emoji:'＋' },
  { id:'friends', label:'Friends', emoji:'👥' },
  { id:'profile', label:'Profile', emoji:'👤' },
];

const NavBar = ({ screen, goTo }) => (
  <View style={{ flexDirection:'row', backgroundColor:'rgba(10,11,16,0.98)', borderTopWidth:1, borderTopColor:C.border, paddingTop:10, paddingBottom:Platform.OS==='ios'?24:10, justifyContent:'space-around' }}>
    {NAV.map(n => (
      <TouchableOpacity key={n.id} onPress={()=>{ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); goTo(n.id); }} activeOpacity={0.7} style={{ alignItems:'center', gap:3, paddingHorizontal:12 }}>
        <Text style={{ fontSize:n.id==='add'?22:18, color:screen===n.id?C.accent:C.text3 }}>{n.emoji}</Text>
        <Text style={{ fontSize:9, fontWeight:'700', color:screen===n.id?C.accent:C.text3, letterSpacing:0.3 }}>{n.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function App() {
  const [user,    setUserState]    = useState(null);
  const [events,  setEventsState]  = useState(SEED_EVENTS);
  const [friends, setFriendsState] = useState([]);
  const [loaded,  setLoaded]       = useState(false);

  const [location,      setLocation]      = useState(null);
  const [locationError, setLocationError] = useState(null);
  const locationSub = useRef(null);

  const [screen,       setScreen]       = useState('map');
  const [detailEvent,  setDetailEvent]  = useState(null);
  const [editEvent,    setEditEvent]    = useState(null);
  const [newPinCoords, setNewPinCoords] = useState(null);
  const [newLocation,  setNewLocation]  = useState('');

  const [toast, setToast] = useState({ show:false, icon:'📍', title:'', msg:'' });
  const toastTimer       = useRef(null);
  const notifListener    = useRef(null);
  const notifRespListener = useRef(null);

  // Load from storage
  useEffect(() => {
    (async () => {
      const [savedUser, savedEvents, savedFriends] = await Promise.all([
        Storage.get('user'),
        Storage.get('events'),
        Storage.get('friends'),
      ]);
      if (savedUser)    setUserState(savedUser);
      if (savedEvents)  setEventsState(savedEvents);
      if (savedFriends) setFriendsState(savedFriends);
      setLoaded(true);
    })();
  }, []);

  // Persist helpers
  const setUser = useCallback((u) => {
    setUserState(u); Storage.set('user', u);
  }, []);

  const setEvents = useCallback((updater) => {
    setEventsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      Storage.set('events', next);
      return next;
    });
  }, []);

  const setFriends = useCallback((updater) => {
    setFriendsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      Storage.set('friends', next);
      return next;
    });
  }, []);

  // GPS + notifications init
  useEffect(() => {
    if (!loaded || !user) return;
    initLocation();
    initNotifications();
    return () => {
      locationSub.current?.remove();
      notifListener.current?.remove();
      notifRespListener.current?.remove();
    };
  }, [loaded, user]);

  const initLocation = async () => {
    const perms = await requestPermissions();
    if (!perms.locationFg) {
      setLocationError('Location denied — enable in Settings → Privacy → Location');
      return;
    }
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval:15, timeInterval:20000 },
      (loc) => { setLocation(loc); setLocationError(null); checkProximity(loc); }
    );
    if (perms.locationBg) await startLocationTracking();
  };

  const initNotifications = () => {
    notifListener.current = Notifications.addNotificationReceivedListener(n => {
      const { title, body } = n.request.content;
      fireToast('🔔', title?.replace('📍 ','') || 'Alert', body || '');
    });
    notifRespListener.current = Notifications.addNotificationResponseReceivedListener(r => {
      const eventId = r.notification.request.content.data?.eventId;
      if (eventId) {
        setEventsState(current => {
          const ev = current.find(e => e.id === eventId);
          if (ev) { setDetailEvent(ev); setScreen('detail'); }
          return current;
        });
      }
    });
  };

  const checkProximity = useCallback((loc) => {
    setEventsState(current => {
      let changed = false;
      const updated = current.map(ev => {
        if (!ev.active || (ev.type!=='prox' && ev.type!=='cat') || !ev.lat || !ev.lng) return ev;
        const dist = getDistance(loc.coords.latitude, loc.coords.longitude, ev.lat, ev.lng);
        if (dist <= ev.radius && !ev.triggered) {
          sendNotification(ev.title, ev.type==='cat'
            ? `${ev.amenity} nearby — ${ev.note || 'You have a reminder here!'}`
            : `Within ${ev.radius}m — ${ev.note || 'You have a reminder here!'}`
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          fireToast('📍', ev.title, `Within ${Math.round(dist)}m of your pin`);
          changed = true;
          return { ...ev, triggered:true };
        }
        if (dist > ev.radius * 1.5 && ev.triggered) {
          changed = true;
          return { ...ev, triggered:false };
        }
        return ev;
      });
      if (changed) Storage.set('events', updated);
      return changed ? updated : current;
    });
  }, []);

  const fireToast = useCallback((icon, title, msg) => {
    clearTimeout(toastTimer.current);
    setToast({ show:true, icon, title, msg });
    toastTimer.current = setTimeout(() => setToast(t=>({...t,show:false})), 3500);
  }, []);

  const goTo = useCallback((id) => setScreen(id), []);

  const saveEvent = useCallback((ev) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === ev.id);
      if (idx >= 0) { const n=[...prev]; n[idx]=ev; return n; }
      return [ev, ...prev];
    });
  }, [setEvents]);

  const deleteEvent  = useCallback((id) => setEvents(prev => prev.filter(e => e.id !== id)), [setEvents]);
  const toggleActive = useCallback((id) => setEvents(prev => prev.map(e => e.id===id ? {...e, active:!e.active, triggered:false} : e)), [setEvents]);

  if (!loaded) return <View style={{ flex:1, backgroundColor:C.bg }}/>;

  const showNav = !['add','edit','detail'].includes(screen);

  if (!user) return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <OnboardingScreen onComplete={(u) => { setUser(u); setScreen('map'); }}/>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <ToastBanner toast={toast}/>
      <View style={{ flex:1 }}>
        {screen==='map'     && <MapScreen goTo={goTo} events={events} location={location} locationError={locationError} setNewPinCoords={setNewPinCoords} fireToast={fireToast}/>}
        {screen==='events'  && <EventsScreen goTo={goTo} events={events} setDetailEvent={(ev)=>{ setDetailEvent(ev); setEditEvent(ev); }} location={location}/>}
        {screen==='add'     && <AddEditScreen goTo={goTo} onSave={saveEvent} onDelete={deleteEvent} existing={null} pinCoords={newPinCoords} newLocation={newLocation} friends={friends} fireToast={fireToast}/>}
        {screen==='detail'  && <DetailScreen goTo={goTo} event={detailEvent} onToggleActive={toggleActive} fireToast={fireToast}/>}
        {screen==='edit'    && <AddEditScreen goTo={goTo} onSave={saveEvent} onDelete={deleteEvent} existing={editEvent} pinCoords={null} newLocation="" friends={friends} fireToast={fireToast}/>}
        {screen==='friends' && <FriendsScreen friends={friends} setFriends={setFriends} user={user} fireToast={fireToast}/>}
        {screen==='profile' && <ProfileScreen user={user} setUser={setUser} events={events} friends={friends} fireToast={fireToast} onLogout={async()=>{ await Storage.remove('user'); setUserState(null); setScreen('map'); }}/>}
      </View>
      {showNav && <NavBar screen={screen} goTo={goTo}/>}
    </View>
  );
}
