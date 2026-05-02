import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Switch, Animated, Platform,
} from 'react-native';
import { C } from './constants';

export const Badge = ({ type, label }) => {
  const palette = {
    time:   { bg: 'rgba(245,166,35,0.15)',  fg: C.pinTime  },
    prox:   { bg: 'rgba(79,115,255,0.15)',  fg: C.pinProx  },
    cat:    { bg: 'rgba(176,111,255,0.15)', fg: C.pinCat   },
    active: { bg: 'rgba(62,207,142,0.15)',  fg: C.success  },
    shared: { bg: 'rgba(79,115,255,0.15)',  fg: C.accent   },
    paused: { bg: 'rgba(122,127,154,0.15)', fg: C.text2    },
  };
  const p = palette[type] || palette.active;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:p.bg, borderRadius:20, paddingHorizontal:9, paddingVertical:3 }}>
      <View style={{ width:5, height:5, borderRadius:3, backgroundColor:p.fg }}/>
      <Text style={{ fontSize:10, fontWeight:'700', color:p.fg }}>{label}</Text>
    </View>
  );
};

export const Card = ({ children, style, onPress, highlight }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={onPress ? 0.78 : 1}
    style={[{
      backgroundColor: highlight ? 'rgba(176,111,255,0.08)' : C.card,
      borderColor:     highlight ? C.pinCat : C.border,
      borderWidth: 1, borderRadius: 18, padding: 14, overflow: 'hidden',
    }, style]}
  >
    {children}
  </TouchableOpacity>
);

export const Btn = ({ label, onPress, variant, style, disabled }) => {
  const v2 = variant || 'primary';
  const styles = {
    primary: { bg: C.accent,                     fg: '#fff',    border: C.accent                  },
    ghost:   { bg: C.surface2,                    fg: C.text,    border: C.border                  },
    danger:  { bg: 'rgba(255,95,95,0.12)',         fg: C.danger,  border: 'rgba(255,95,95,0.3)'    },
    purple:  { bg: 'rgba(176,111,255,0.12)',       fg: C.pinCat,  border: 'rgba(176,111,255,0.3)'  },
    success: { bg: 'rgba(62,207,142,0.12)',        fg: C.success, border: 'rgba(62,207,142,0.3)'   },
  };
  const v = styles[v2] || styles.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
      style={[{
        backgroundColor: v.bg, borderColor: v.border, borderWidth: 1,
        borderRadius: 13, paddingVertical: 12, paddingHorizontal: 18,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1,
      }, style]}
    >
      <Text style={{ color: v.fg, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
};

export const SectionLabel = ({ children }) => (
  <Text style={{ fontSize:10, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:1.2, paddingHorizontal:18, paddingTop:14, paddingBottom:5 }}>
    {children}
  </Text>
);

export const Divider = ({ style }) => (
  <View style={[{ height:1, backgroundColor:C.border, marginVertical:10 }, style]}/>
);

export const ToggleRow = ({ label, sub, value, onValueChange }) => (
  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:4 }}>
    <View style={{ flex:1, marginRight:12 }}>
      <Text style={{ fontSize:14, fontWeight:'600', color:C.text }}>{label}</Text>
      {sub ? <Text style={{ fontSize:11, color:C.text2, marginTop:2 }}>{sub}</Text> : null}
    </View>
    <Switch
      value={value} onValueChange={onValueChange}
      trackColor={{ false: C.surface2, true: C.accent }}
      thumbColor="#fff" ios_backgroundColor={C.surface2}
    />
  </View>
);

export const BackBtn = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ width:36, height:36, borderRadius:11, backgroundColor:C.surface2, borderColor:C.border, borderWidth:1, alignItems:'center', justifyContent:'center' }}>
    <Text style={{ fontSize:18, color:C.text }}>{'<'}</Text>
  </TouchableOpacity>
);

export const ScreenHeader = ({ title, left, right }) => (
  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:10, paddingBottom:8 }}>
    <View style={{ width:80, alignItems:'flex-start' }}>{left || <View style={{ width:36 }}/>}</View>
    <Text style={{ fontSize:19, fontWeight:'800', color:C.text, flex:1, textAlign:'center' }}>{title}</Text>
    <View style={{ width:80, alignItems:'flex-end' }}>{right || <View style={{ width:36 }}/>}</View>
  </View>
);

export const ToastBanner = ({ toast }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: toast.show ? 1 : 0,
      useNativeDriver: true, tension: 80, friction: 9,
    }).start();
  }, [toast.show]);
  const translateY = anim.interpolate({ inputRange:[0,1], outputRange:[-90,0] });
  return (
    <Animated.View style={{ position:'absolute', top:Platform.OS==='ios'?58:12, left:10, right:10, zIndex:999, transform:[{translateY}], opacity:anim }}>
      <View style={{ backgroundColor:'rgba(18,20,28,0.97)', borderColor:C.border, borderWidth:1, borderRadius:18, padding:12, flexDirection:'row', alignItems:'flex-start', gap:10, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.6, shadowRadius:20 }}>
        <View style={{ width:34, height:34, borderRadius:10, backgroundColor:'rgba(79,115,255,0.15)', alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontSize:17 }}>{toast.icon}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:10, color:C.text3, fontWeight:'700', letterSpacing:0.8, textTransform:'uppercase' }}>Memory 5</Text>
          <Text style={{ fontSize:13, fontWeight:'700', color:C.text, marginTop:1 }}>{toast.title}</Text>
          <Text style={{ fontSize:11, color:C.text2, marginTop:1 }}>{toast.msg}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export const ActiveDot = ({ color, size }) => {
  const c = color || C.success;
  const s = size || 7;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue:0.3, duration:1000, useNativeDriver:true }),
        Animated.timing(pulse, { toValue:1,   duration:1000, useNativeDriver:true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width:s, height:s, borderRadius:s/2, backgroundColor:c, opacity:pulse, marginTop:4 }}/>
  );
};

export const EmptyState = ({ icon, title, sub, action, actionLabel }) => (
  <View style={{ alignItems:'center', paddingVertical:60, paddingHorizontal:30 }}>
    <Text style={{ fontSize:40, marginBottom:14 }}>{icon}</Text>
    <Text style={{ fontSize:16, fontWeight:'700', color:C.text2, textAlign:'center' }}>{title}</Text>
    {sub ? <Text style={{ fontSize:13, color:C.text3, textAlign:'center', marginTop:6, lineHeight:20 }}>{sub}</Text> : null}
    {action && actionLabel ? (
      <TouchableOpacity onPress={action} activeOpacity={0.75} style={{ marginTop:20, backgroundColor:C.accent, borderRadius:13, paddingVertical:11, paddingHorizontal:24 }}>
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:14 }}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const AmenityGrid = ({ amenities, selected, onSelect }) => (
  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, paddingHorizontal:16 }}>
    {amenities.map(function(a) {
      const isSel = selected === (a.icon + ' ' + a.label);
      return (
        <TouchableOpacity key={a.label} onPress={function(){ onSelect(a.icon + ' ' + a.label); }} activeOpacity={0.75}
          style={{ width:'22%', alignItems:'center', gap:4, paddingVertical:10, borderRadius:13, borderWidth:1, borderColor:isSel?C.pinCat:C.border, backgroundColor:isSel?'rgba(176,111,255,0.1)':C.card }}>
          <Text style={{ fontSize:20 }}>{a.icon}</Text>
          <Text style={{ fontSize:9, fontWeight:'700', color:isSel?C.pinCat:C.text2, textAlign:'center' }}>{a.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
