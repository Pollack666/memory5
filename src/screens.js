import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Badge, Card, Btn, SectionLabel, Divider,
  ToggleRow, BackBtn, ScreenHeader, ActiveDot,
  EmptyState, AmenityGrid,
} from './components';
import { C, PIN_COLORS, TYPE_LABEL, TYPE_ICON, AMENITIES } from './constants';
import { uid, friendCode, getDistance, formatDistance, fmtDate, fmtTime, fmtDateTime, Storage } from './helpers';
import { scheduleTimeNotification, sendNotification } from './notifications';

const inputStyle = {
  backgroundColor: C.surface2, borderColor: C.border, borderWidth: 1,
  borderRadius: 12, padding: 13, color: C.text, fontSize: 14,
};

export const OnboardingScreen = ({ onComplete }) => {
  const [step, setStep]         = useState(0);
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [code]                  = useState(friendCode);
  const STEPS = [
    { icon:'📍', title:'Memory 5',       sub:'Place reminders anywhere on the map.\nGet alerted by time or when you arrive.' },
    { icon:'👤', title:'Create profile', sub:'Your name, username, and a unique friend code so others can find you.' },
    { icon:'🎉', title:"You're all set!", sub:`Your friend code is\n${code}\nShare it so friends can add you.` },
  ];
  const next = () => {
    if (step===1) {
      if (!name.trim())     { Alert.alert('Required','Please enter your name'); return; }
      if (!username.trim()) { Alert.alert('Required','Please enter a username'); return; }
    }
    if (step===2) { onComplete({ name:name.trim(), username:username.trim().toLowerCase().replace(/\s/g,''), code, avatar:name.trim()[0]?.toUpperCase()||'?' }); return; }
    setStep(s=>s+1);
  };
  const s = STEPS[step];
  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1, alignItems:'center', justifyContent:'center', padding:28 }}>
      <View style={{ width:80, height:80, borderRadius:24, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', marginBottom:8, shadowColor:C.accent, shadowOffset:{width:0,height:8}, shadowOpacity:0.5, shadowRadius:20 }}>
        <Text style={{ fontSize:36 }}>{s.icon}</Text>
      </View>
      <Text style={{ fontSize:28, fontWeight:'800', color:C.text, textAlign:'center', marginBottom:8 }}>{s.title}</Text>
      <Text style={{ fontSize:14, color:C.text2, textAlign:'center', lineHeight:22, marginBottom:20 }}>{s.sub}</Text>
      {step===1 && (
        <View style={{ width:'100%', gap:12, marginBottom:20 }}>
          <TextInput style={inputStyle} placeholder="Your full name" placeholderTextColor={C.text3} value={name} onChangeText={setName} autoCapitalize="words"/>
          <TextInput style={inputStyle} placeholder="Username (no spaces)" placeholderTextColor={C.text3} value={username} onChangeText={t=>setUsername(t.toLowerCase().replace(/\s/g,''))} autoCapitalize="none" autoCorrect={false}/>
          <View style={{ backgroundColor:C.surface2, borderColor:C.border, borderWidth:1, borderRadius:12, padding:14 }}>
            <Text style={{ fontSize:10, color:C.text3, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>Your friend code — share this!</Text>
            <Text style={{ fontSize:26, fontWeight:'800', color:C.accent, letterSpacing:4 }}>{code}</Text>
          </View>
        </View>
      )}
      {step===2 && name && (
        <View style={{ width:'100%', backgroundColor:C.surface2, borderColor:C.border, borderWidth:1, borderRadius:16, padding:16, marginBottom:20 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:13 }}>
            <View style={{ width:46, height:46, borderRadius:14, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:22, fontWeight:'800', color:'#fff' }}>{name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:16, fontWeight:'700', color:C.text }}>{name}</Text>
              <Text style={{ fontSize:12, color:C.text2 }}>@{username}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontSize:9, color:C.text3, fontWeight:'700', textTransform:'uppercase' }}>Code</Text>
              <Text style={{ fontSize:18, fontWeight:'800', color:C.accent, letterSpacing:2 }}>{code}</Text>
            </View>
          </View>
        </View>
      )}
      <TouchableOpacity onPress={next} activeOpacity={0.8} style={{ width:'100%', backgroundColor:C.accent, borderRadius:16, paddingVertical:15, alignItems:'center', shadowColor:C.accent, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12 }}>
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:15 }}>{step===2?'Open Memory 5 →':'Continue'}</Text>
      </TouchableOpacity>
      {step>0 && <TouchableOpacity onPress={()=>setStep(s=>s-1)} style={{ marginTop:16 }}><Text style={{ fontSize:13, color:C.text3 }}>← Back</Text></TouchableOpacity>}
    </KeyboardAvoidingView>
  );
};

export const MapScreen = ({ goTo, events, location, locationError, setNewPinCoords, fireToast }) => {
  const mapRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const goToMyLocation = () => {
    if (!location) { fireToast('⚠️','No GPS',locationError||'Enable location in Settings'); return; }
    mapRef.current?.animateToRegion({ latitude:location.coords.latitude, longitude:location.coords.longitude, latitudeDelta:0.01, longitudeDelta:0.01 }, 600);
  };
  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setNewPinCoords({ lat:latitude, lng:longitude });
    goTo('add');
  };
  const initialRegion = { latitude:location?.coords.latitude??52.52, longitude:location?.coords.longitude??13.405, latitudeDelta:0.015, longitudeDelta:0.015 };
  return (
    <View style={{ flex:1 }}>
      <MapView ref={mapRef} style={{ flex:1 }} provider={PROVIDER_GOOGLE} initialRegion={initialRegion} showsUserLocation showsMyLocationButton={false} mapType="mutedStandard" userInterfaceStyle="dark" onPress={handleMapPress}>
        {events.filter(e=>e.active&&e.lat&&e.lng).map(ev=>(
          <React.Fragment key={ev.id}>
            {(ev.type==='prox'||ev.type==='cat') && <Circle center={{ latitude:ev.lat, longitude:ev.lng }} radius={ev.radius} fillColor={`${PIN_COLORS[ev.type]}18`} strokeColor={`${PIN_COLORS[ev.type]}55`} strokeWidth={1.5}/>}
            <Marker coordinate={{ latitude:ev.lat, longitude:ev.lng }} title={ev.title} description={ev.note||ev.location||''} onPress={()=>setSelectedEvent(ev)} pinColor={PIN_COLORS[ev.type]}/>
          </React.Fragment>
        ))}
      </MapView>
      <View style={{ position:'absolute', top:10, left:12, right:12 }}>
        <TouchableOpacity onPress={()=>goTo('search')} activeOpacity={0.9} style={{ backgroundColor:'rgba(18,20,28,0.94)', borderColor:C.border, borderWidth:1, borderRadius:14, flexDirection:'row', alignItems:'center', gap:9, paddingHorizontal:13, paddingVertical:11 }}>
          <Text>🔍</Text>
          <Text style={{ fontSize:13, color:C.text3 }}>Search places, shops, pharmacies…</Text>
        </TouchableOpacity>
      </View>
      {location && (
        <View style={{ position:'absolute', top:68, left:12, backgroundColor:'rgba(14,16,24,0.9)', borderColor:C.border, borderWidth:1, borderRadius:10, paddingHorizontal:9, paddingVertical:4, flexDirection:'row', alignItems:'center', gap:5 }}>
          <View style={{ width:6, height:6, borderRadius:3, backgroundColor:C.success }}/>
          <Text style={{ fontSize:10, color:C.text2, fontWeight:'700' }}>GPS ±{Math.round(location.coords.accuracy)}m</Text>
        </View>
      )}
      {locationError && (
        <View style={{ position:'absolute', top:68, left:12, right:12, backgroundColor:'rgba(255,95,95,0.14)', borderColor:'rgba(255,95,95,0.3)', borderWidth:1, borderRadius:11, padding:9, flexDirection:'row', alignItems:'center', gap:7 }}>
          <Text style={{ fontSize:12 }}>⚠️</Text>
          <Text style={{ fontSize:12, color:C.danger, flex:1 }}>{locationError}</Text>
        </View>
      )}
      <View style={{ position:'absolute', bottom:86, left:12, gap:4 }}>
        {[['time',C.pinTime,'Time'],['prox',C.pinProx,'Proximity'],['cat',C.pinCat,'Category']].map(([t,col,l])=>(
          <View key={t} style={{ backgroundColor:'rgba(14,16,24,0.88)', borderColor:C.border, borderWidth:1, borderRadius:8, paddingHorizontal:8, paddingVertical:3, flexDirection:'row', alignItems:'center', gap:5 }}>
            <View style={{ width:6, height:6, borderRadius:3, backgroundColor:col }}/>
            <Text style={{ fontSize:10, fontWeight:'700', color:C.text2 }}>{l} ({events.filter(e=>e.type===t&&e.active).length})</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={goToMyLocation} activeOpacity={0.8} style={{ position:'absolute', bottom:90, right:12, width:46, height:46, borderRadius:14, backgroundColor:C.accent, alignItems:'center', justifyContent:'center', shadowColor:C.accent, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:12 }}>
        <Text style={{ fontSize:20 }}>📍</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={()=>{ setNewPinCoords(null); goTo('add'); }} activeOpacity={0.8} style={{ position:'absolute', bottom:90, right:66, width:46, height:46, borderRadius:14, backgroundColor:C.surface2, borderColor:C.border, borderWidth:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:22, color:C.text, lineHeight:28 }}>＋</Text>
      </TouchableOpacity>
      <View style={{ position:'absolute', bottom:100, alignSelf:'center', backgroundColor:'rgba(14,16,24,0.85)', borderColor:C.border, borderWidth:1, borderRadius:10, paddingHorizontal:12, paddingVertical:5 }}>
        <Text style={{ fontSize:11, color:C.text2 }}>Tap map to drop a pin  ＋</Text>
      </View>
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={()=>setSelectedEvent(null)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }} activeOpacity={1} onPress={()=>setSelectedEvent(null)}>
          {selectedEvent && (
            <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:16, paddingBottom:36, borderTopWidth:1, borderTopColor:C.border }}>
              <View style={{ width:32, height:4, backgroundColor:C.border, borderRadius:2, alignSelf:'center', marginBottom:16 }}/>
              <Text style={{ fontSize:19, fontWeight:'800', color:C.text, marginBottom:4 }}>{selectedEvent.title}</Text>
              {selectedEvent.note?<Text style={{ fontSize:13, color:C.text2, marginBottom:10 }}>{selectedEvent.note}</Text>:null}
              <View style={{ flexDirection:'row', gap:6, marginBottom:12 }}><Badge type={selectedEvent.type} label={TYPE_LABEL[selectedEvent.type]}/></View>
              <Card style={{ marginBottom:14 }}>
                <Text style={{ fontSize:13, fontWeight:'600', color:C.text }}>
                  {selectedEvent.type==='time'&&`⏰ ${fmtDateTime(selectedEvent.triggerTime)}`}
                  {selectedEvent.type==='prox'&&`📡 Alert within ${selectedEvent.radius} m`}
                  {selectedEvent.type==='cat'&&`${selectedEvent.amenity} · ${selectedEvent.radius} m`}
                </Text>
              </Card>
              <View style={{ flexDirection:'row', gap:10 }}>
                <Btn label="Close" variant="ghost" style={{ flex:1 }} onPress={()=>setSelectedEvent(null)}/>
                <Btn label="Edit →" variant="primary" style={{ flex:1 }} onPress={()=>{ setSelectedEvent(null); goTo('edit'); }}/>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const EventsScreen = ({ goTo, events, setDetailEvent, location }) => {
  const [filter, setFilter] = useState('All');
  const FILTERS = ['All','⏰ Time','📡 Prox','🏪 Cat','✅ Done'];
  const filtered = events.filter(ev => {
    if (filter==='All')          return ev.active;
    if (filter.includes('Time')) return ev.type==='time'&&ev.active;
    if (filter.includes('Prox')) return ev.type==='prox'&&ev.active;
    if (filter.includes('Cat'))  return ev.type==='cat'&&ev.active;
    if (filter.includes('Done')) return !ev.active;
    return true;
  });
  return (
    <View style={{ flex:1 }}>
      <View style={{ paddingHorizontal:18, paddingTop:14, paddingBottom:6 }}>
        <Text style={{ fontSize:26, fontWeight:'800', color:C.text }}>Events</Text>
        <Text style={{ fontSize:12, color:C.text3, marginTop:2 }}>{events.filter(e=>e.active).length} active · {events.length} total</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:14, paddingBottom:10, gap:7 }}>
        {FILTERS.map(f=>(
          <TouchableOpacity key={f} onPress={()=>setFilter(f)} activeOpacity={0.75} style={{ paddingHorizontal:13, paddingVertical:6, borderRadius:20, backgroundColor:filter===f?C.accent:C.surface2, borderColor:filter===f?C.accent:C.border, borderWidth:1 }}>
            <Text style={{ fontSize:11, fontWeight:'700', color:filter===f?'#fff':C.text2 }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:13, paddingBottom:90 }} showsVerticalScrollIndicator={false}>
        {filtered.length===0 && <EmptyState icon="📭" title="No events here" sub="Tap + to add a new reminder" action={()=>goTo('add')} actionLabel="Add event"/>}
        {filtered.map(ev=>{
          const dist = location&&ev.lat&&ev.lng ? formatDistance(getDistance(location.coords.latitude,location.coords.longitude,ev.lat,ev.lng)) : null;
          const inRange = location&&ev.lat&&ev.lng&&(ev.type==='prox'||ev.type==='cat')&&getDistance(location.coords.latitude,location.coords.longitude,ev.lat,ev.lng)<=ev.radius;
          return (
            <Card key={ev.id} highlight={ev.type==='cat'} style={{ marginBottom:9 }} onPress={()=>{ setDetailEvent(ev); goTo('detail'); }}>
              <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <Text style={{ fontSize:14, fontWeight:'700', color:C.text, flex:1, lineHeight:20 }}>{ev.title}</Text>
                {ev.active&&<ActiveDot color={inRange?C.danger:C.success}/>}
              </View>
              {ev.location?<Text style={{ fontSize:11, color:C.text2, marginTop:3 }}>📍 {ev.location}</Text>:null}
              {dist&&<Text style={{ fontSize:11, color:inRange?C.danger:C.text2, marginTop:2, fontWeight:inRange?'700':'400' }}>{inRange?'🔔 In range!  ':''}{dist} away</Text>}
              <View style={{ flexDirection:'row', gap:6, marginTop:9, flexWrap:'wrap' }}>
                <Badge type={ev.type} label={TYPE_LABEL[ev.type]}/>
                {ev.shared&&<Badge type="shared" label="Shared"/>}
                {!ev.active&&<Badge type="paused" label="Paused"/>}
              </View>
              <Text style={{ fontSize:11, color:C.text2, marginTop:7 }}>
                {ev.type==='time'&&`⏰ ${fmtDateTime(ev.triggerTime)}`}
                {ev.type==='prox'&&`📡 ${ev.radius} m radius`}
                {ev.type==='cat'&&`${ev.amenity} · ${ev.radius} m`}
              </Text>
              {ev.note?<Text style={{ fontSize:11, color:C.text3, marginTop:4, fontStyle:'italic' }}>"{ev.note}"</Text>:null}
              <Text style={{ fontSize:10, color:C.text3, marginTop:6 }}>Added {fmtDate(ev.createdAt)}</Text>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const AddEditScreen = ({ goTo, onSave, onDelete, existing, pinCoords, newLocation, friends, fireToast }) => {
  const isEdit = !!existing;
  const [title,       setTitle]       = useState(existing?.title||'');
  const [note,        setNote]        = useState(existing?.note||'');
  const [type,        setType]        = useState(existing?.type||'time');
  const [radius,      setRadius]      = useState(existing?.radius||150);
  const [triggerTime, setTriggerTime] = useState(existing?.triggerTime||'');
  const [location,    setLocation]    = useState(existing?.location||newLocation||'');
  const [amenity,     setAmenity]     = useState(existing?.amenity||'💊 Pharmacy');
  const [active,      setActive]      = useState(existing?.active!==false);
  const [shared,      setShared]      = useState(existing?.shared||false);
  const [sharedWith,  setSharedWith]  = useState(existing?.sharedWith||[]);
  const lat = existing?.lat??pinCoords?.lat??52.52;
  const lng = existing?.lng??pinCoords?.lng??13.405;
  const toggleFriend = (fid) => setSharedWith(prev=>prev.includes(fid)?prev.filter(x=>x!==fid):[...prev,fid]);
  const save = () => {
    if (!title.trim()) { Alert.alert('Required','Please give your reminder a name'); return; }
    const ev = { id:existing?.id||('e'+uid()), title:title.trim(), note:note.trim(), type, radius:Number(radius), triggerTime, location, amenity, lat, lng, active, shared, sharedWith, createdAt:existing?.createdAt||new Date().toISOString(), triggered:false };
    onSave(ev);
    if (type==='time'&&triggerTime) scheduleTimeNotification(ev);
    fireToast('✅',isEdit?'Updated!':'Saved!',`"${title.trim()}" is now active`);
    goTo('events');
  };
  const confirmDelete = () => Alert.alert('Delete event?','This cannot be undone.',[
    { text:'Cancel', style:'cancel' },
    { text:'Delete', style:'destructive', onPress:()=>{ onDelete(existing.id); fireToast('🗑️','Deleted','Event removed'); goTo('events'); } },
  ]);
  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{ flex:1 }}>
      <ScreenHeader title={isEdit?'Edit Event':'New Event'}
        left={<BackBtn onPress={()=>goTo(isEdit?'detail':'events')}/>}
        right={<TouchableOpacity onPress={save} style={{ backgroundColor:C.accent, borderRadius:11, paddingHorizontal:15, paddingVertical:8 }}><Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Save</Text></TouchableOpacity>}
      />
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingBottom:100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel>Details</SectionLabel>
        <View style={{ paddingHorizontal:16, gap:11 }}>
          <TextInput style={inputStyle} placeholder="Title *" placeholderTextColor={C.text3} value={title} onChangeText={setTitle}/>
          <TextInput style={inputStyle} placeholder="Note (optional)" placeholderTextColor={C.text3} value={note} onChangeText={setNote}/>
          <TextInput style={inputStyle} placeholder="Location name or address" placeholderTextColor={C.text3} value={location} onChangeText={setLocation}/>
        </View>
        <SectionLabel>Trigger type</SectionLabel>
        <View style={{ flexDirection:'row', gap:9, paddingHorizontal:16 }}>
          {[{id:'time',icon:'⏰',label:'Time'},{id:'prox',icon:'📡',label:'Proximity'},{id:'cat',icon:'🏪',label:'Category'}].map(t=>(
            <TouchableOpacity key={t.id} onPress={()=>setType(t.id)} activeOpacity={0.75} style={{ flex:1, padding:13, borderRadius:15, borderWidth:2, borderColor:type===t.id?C.accent:C.border, backgroundColor:type===t.id?'rgba(79,115,255,0.08)':C.card, alignItems:'center', gap:6 }}>
              <Text style={{ fontSize:22 }}>{t.icon}</Text>
              <Text style={{ fontSize:11, fontWeight:'700', color:type===t.id?C.accent:C.text2 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {type==='time'&&(
          <>
            <SectionLabel>Date & Time</SectionLabel>
            <View style={{ paddingHorizontal:16 }}>
              <TextInput style={inputStyle} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={C.text3} value={triggerTime} onChangeText={setTriggerTime}/>
              <Text style={{ fontSize:11, color:C.text3, marginTop:5 }}>Example: 2025-06-15 14:30</Text>
            </View>
          </>
        )}
        {(type==='prox'||type==='cat')&&(
          <>
            <SectionLabel>Alert radius</SectionLabel>
            <View style={{ paddingHorizontal:16 }}>
              <Card>
                <View style={{ flexDirection:'row', alignItems:'baseline', gap:4, marginBottom:13 }}>
                  <Text style={{ fontSize:28, fontWeight:'800', color:type==='cat'?C.pinCat:C.accent }}>{radius}</Text>
                  <Text style={{ fontSize:13, color:C.text2 }}>metres</Text>
                </View>
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  {[50,100,150,200,300,500].map(v=>(
                    <TouchableOpacity key={v} onPress={()=>setRadius(v)} activeOpacity={0.75} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:radius===v?C.accent:C.surface2, borderColor:radius===v?C.accent:C.border, borderWidth:1 }}>
                      <Text style={{ fontSize:12, fontWeight:'700', color:radius===v?'#fff':C.text2 }}>{v}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            </View>
          </>
        )}
        {type==='cat'&&(
          <>
            <SectionLabel>Category</SectionLabel>
            <AmenityGrid amenities={AMENITIES} selected={amenity} onSelect={setAmenity}/>
          </>
        )}
        <SectionLabel>Options</SectionLabel>
        <View style={{ paddingHorizontal:16 }}>
          <Card>
            <ToggleRow label="Event active" sub="Pause without deleting" value={active} onValueChange={setActive}/>
            <Divider/>
            <ToggleRow label="Share with friends" sub="Friends get a copy of this event" value={shared} onValueChange={setShared}/>
          </Card>
        </View>
        {shared&&friends.length>0&&(
          <>
            <SectionLabel>Share with</SectionLabel>
            <View style={{ paddingHorizontal:16, gap:8 }}>
              {friends.map(f=>(
                <TouchableOpacity key={f.id} onPress={()=>toggleFriend(f.id)} activeOpacity={0.75} style={{ flexDirection:'row', alignItems:'center', gap:12, padding:11, borderRadius:14, borderWidth:1, borderColor:sharedWith.includes(f.id)?C.accent:C.border, backgroundColor:sharedWith.includes(f.id)?'rgba(79,115,255,0.08)':C.card }}>
                  <View style={{ width:34, height:34, borderRadius:10, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' }}>
                    <Text style={{ fontSize:16, fontWeight:'800', color:'#fff' }}>{f.avatar}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:C.text }}>{f.name}</Text>
                    <Text style={{ fontSize:11, color:C.text2 }}>@{f.username}</Text>
                  </View>
                  {sharedWith.includes(f.id)&&<View style={{ width:20, height:20, borderRadius:10, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#fff', fontSize:12 }}>✓</Text></View>}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {isEdit&&(
          <>
            <SectionLabel>Danger zone</SectionLabel>
            <View style={{ paddingHorizontal:16 }}>
              <Btn label="🗑  Delete this event" variant="danger" onPress={confirmDelete} style={{ width:'100%' }}/>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const DetailScreen = ({ goTo, event, onToggleActive, fireToast }) => {
  if (!event) { goTo('events'); return null; }
  const ev = event;
  return (
    <View style={{ flex:1 }}>
      <ScreenHeader title="Detail"
        left={<BackBtn onPress={()=>goTo('events')}/>}
        right={<TouchableOpacity onPress={()=>goTo('edit')} style={{ backgroundColor:C.surface2, borderColor:C.border, borderWidth:1, borderRadius:11, paddingHorizontal:13, paddingVertical:7 }}><Text style={{ color:C.text, fontWeight:'700', fontSize:13 }}>Edit</Text></TouchableOpacity>}
      />
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:90 }} showsVerticalScrollIndicator={false}>
        <View style={{ height:140, borderRadius:18, overflow:'hidden', marginBottom:14 }}>
          <MapView style={{ flex:1 }} provider={PROVIDER_GOOGLE} initialRegion={{ latitude:ev.lat||52.52, longitude:ev.lng||13.405, latitudeDelta:0.005, longitudeDelta:0.005 }} scrollEnabled={false} zoomEnabled={false} mapType="mutedStandard" userInterfaceStyle="dark">
            {ev.lat&&ev.lng&&(
              <>
                {(ev.type==='prox'||ev.type==='cat')&&<Circle center={{ latitude:ev.lat, longitude:ev.lng }} radius={ev.radius} fillColor={`${PIN_COLORS[ev.type]}18`} strokeColor={`${PIN_COLORS[ev.type]}55`} strokeWidth={1.5}/>}
                <Marker coordinate={{ latitude:ev.lat, longitude:ev.lng }} pinColor={PIN_COLORS[ev.type]}/>
              </>
            )}
          </MapView>
          {ev.location&&<View style={{ position:'absolute', bottom:8, right:8, backgroundColor:'rgba(14,16,24,0.85)', borderColor:C.border, borderWidth:1, borderRadius:8, paddingHorizontal:9, paddingVertical:4 }}><Text style={{ fontSize:10, color:C.text2 }}>{ev.location}</Text></View>}
        </View>
        <Card style={{ marginBottom:12 }}>
          <Text style={{ fontSize:18, fontWeight:'800', color:C.text }}>{ev.title}</Text>
          {ev.note?<Text style={{ fontSize:13, color:C.text2, marginTop:5 }}>{ev.note}</Text>:null}
          <Divider/>
          <View style={{ flexDirection:'row', gap:14, flexWrap:'wrap' }}>
            <View><Text style={{ fontSize:10, color:C.text3 }}>Type</Text><Text style={{ fontSize:13, fontWeight:'700', color:C.text, marginTop:3 }}>{TYPE_ICON[ev.type]} {TYPE_LABEL[ev.type]}</Text></View>
            {ev.type==='time'&&<View><Text style={{ fontSize:10, color:C.text3 }}>Trigger</Text><Text style={{ fontSize:13, fontWeight:'700', color:C.pinTime, marginTop:3 }}>{fmtDateTime(ev.triggerTime)}</Text></View>}
            {(ev.type==='prox'||ev.type==='cat')&&<View><Text style={{ fontSize:10, color:C.text3 }}>Radius</Text><Text style={{ fontSize:13, fontWeight:'700', color:C.accent, marginTop:3 }}>{ev.radius} m</Text></View>}
            {ev.type==='cat'&&<View><Text style={{ fontSize:10, color:C.text3 }}>Category</Text><Text style={{ fontSize:13, fontWeight:'700', color:C.text, marginTop:3 }}>{ev.amenity}</Text></View>}
            <View><Text style={{ fontSize:10, color:C.text3 }}>Status</Text><Text style={{ fontSize:13, fontWeight:'700', color:ev.active?C.success:C.text3, marginTop:3 }}>{ev.active?'Active':'Paused'}</Text></View>
          </View>
          <Text style={{ fontSize:10, color:C.text3, marginTop:12 }}>Created {fmtDate(ev.createdAt)}</Text>
        </Card>
        <Card onPress={()=>{ sendNotification(ev.title,ev.note||'Test alert from Memory 5'); fireToast('🔔','Test sent!','Check your notifications'); }} style={{ marginBottom:12 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ fontSize:22 }}>🔔</Text>
            <View style={{ flex:1 }}><Text style={{ fontWeight:'700', fontSize:14, color:C.text }}>Test notification</Text><Text style={{ fontSize:11, color:C.text2, marginTop:2 }}>Tap to fire a test alert now</Text></View>
            <Text style={{ fontSize:16, color:C.text3 }}>›</Text>
          </View>
        </Card>
        <Card style={{ marginBottom:12 }}>
          <ToggleRow label="Event active" sub="Pause without deleting" value={ev.active} onValueChange={()=>onToggleActive(ev.id)}/>
        </Card>
        <View style={{ flexDirection:'row', gap:10 }}>
          <Btn label="✏️  Edit"  variant="ghost"  style={{ flex:1 }} onPress={()=>goTo('edit')}/>
          <Btn label="📤  Share" variant="purple" style={{ flex:1 }} onPress={()=>fireToast('📤','Shared!','Event link copied')}/>
        </View>
      </ScrollView>
    </View>
  );
};

export const FriendsScreen = ({ friends, setFriends, user, fireToast }) => {
  const [tab,     setTab]     = useState('friends');
  const [code,    setCode]    = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const addFriend = () => {
    const c = code.trim().toUpperCase();
    if (c.length<4)                      { fireToast('⚠️','Invalid code','Enter a valid 6-char code'); return; }
    if (c===user.code)                   { fireToast('⚠️',"That's you!","You can't add yourself"); return; }
    if (friends.find(f=>f.code===c))     { fireToast('ℹ️','Already added','This person is already a friend'); return; }
    setFriends(prev=>[...prev,{ id:'f'+uid(), name:'Friend '+c, username:c.toLowerCase(), avatar:c[0], code:c, sharedEvents:0 }]);
    setCode(''); setShowAdd(false);
    fireToast('👋','Friend added!',`${c} joined your network`);
  };
  return (
    <View style={{ flex:1 }}>
      <View style={{ paddingHorizontal:18, paddingTop:14, paddingBottom:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
        <Text style={{ fontSize:26, fontWeight:'800', color:C.text }}>Friends</Text>
        <TouchableOpacity onPress={()=>setShowAdd(!showAdd)} activeOpacity={0.75} style={{ backgroundColor:C.accent, borderRadius:11, paddingHorizontal:14, paddingVertical:8 }}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>＋ Add</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal:14, marginBottom:10 }}>
        <Card>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <View style={{ width:44, height:44, borderRadius:13, backgroundColor:C.accent, alignItems:'center', justifyContent:'center' }}>
              <Text style={{ fontSize:20, fontWeight:'800', color:'#fff' }}>{user.avatar}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:14, fontWeight:'700', color:C.text }}>{user.name}</Text>
              <Text style={{ fontSize:11, color:C.text2 }}>@{user.username}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontSize:9, color:C.text3,​​​​​​​​​​​​​​​​
