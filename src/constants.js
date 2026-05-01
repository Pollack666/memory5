export const C = {
  bg:         '#0a0b10',
  surface:    '#12141c',
  surface2:   '#191c27',
  border:     '#222536',
  accent:     '#4f73ff',
  accentGlow: 'rgba(79,115,255,0.3)',
  danger:     '#ff5f5f',
  success:    '#3ecf8e',
  text:       '#eceef8',
  text2:      '#7a7f9a',
  text3:      '#42465a',
  card:       '#141720',
  pinTime:    '#f5a623',
  pinProx:    '#4f73ff',
  pinCat:     '#b06fff',
};

export const PIN_COLORS  = { time: C.pinTime, prox: C.pinProx, cat: C.pinCat };
export const TYPE_LABEL  = { time: 'Time',    prox: 'Proximity', cat: 'Category' };
export const TYPE_ICON   = { time: '⏰',      prox: '📡',        cat: '🏪' };

export const AMENITIES = [
  { icon: '💊', label: 'Pharmacy'    },
  { icon: '🛒', label: 'Supermarket' },
  { icon: '☕', label: 'Café'        },
  { icon: '🏧', label: 'ATM'         },
  { icon: '⛽', label: 'Fuel'        },
  { icon: '🏥', label: 'Hospital'    },
  { icon: '📮', label: 'Post'        },
  { icon: '🅿️', label: 'Parking'    },
  { icon: '🏋️', label: 'Gym'        },
  { icon: '📚', label: 'Library'     },
  { icon: '🍕', label: 'Food'        },
  { icon: '🎬', label: 'Cinema'      },
];

export const SEED_EVENTS = [
  {
    id: 'seed1',
    title: 'Buy coffee beans',
    note: 'Ethiopian blend + V60 filters',
    type: 'prox',
    triggerTime: '',
    location: 'Rösterei, Mitte',
    lat: 52.5234,
    lng: 13.4101,
    radius: 150,
    amenity: '',
    active: true,
    shared: false,
    sharedWith: [],
    createdAt: new Date().toISOString(),
    triggered: false,
  },
  {
    id: 'seed2',
    title: 'Pick up prescription',
    note: '',
    type: 'cat',
    triggerTime: '',
    location: '',
    lat: 52.5196,
    lng: 13.4069,
    radius: 100,
    amenity: '💊 Pharmacy',
    active: true,
    shared: false,
    sharedWith: [],
    createdAt: new Date().toISOString(),
    triggered: false,
  },
];
