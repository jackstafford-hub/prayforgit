import { useState, useEffect } from 'react';

export interface Prayer {
  id: string;
  title: string;
  description?: string;
  count: number;
  createdAt: string;
}

// Initial seed data to make the prototype look alive
const INITIAL_PRAYERS: Prayer[] = [
  {
    id: '1',
    title: 'Healing for my mother',
    description: 'She has been battling illness for months. We are praying for a complete recovery and strength for the family.',
    count: 12,
    createdAt: new Date(Date.now() - 10000000).toISOString(),
  },
  {
    id: '2',
    title: 'Peace in my marriage',
    description: 'Going through a rough patch. Asking for guidance, patience, and love to be restored.',
    count: 5,
    createdAt: new Date(Date.now() - 5000000).toISOString(),
  },
  {
    id: '3',
    title: 'Job opportunity',
    description: 'I have an interview on Tuesday. Praying for favor and the right door to open.',
    count: 8,
    createdAt: new Date(Date.now() - 2000000).toISOString(),
  }
];

// Simple in-memory store with a listener pattern for this prototype
let prayers: Prayer[] = [...INITIAL_PRAYERS];
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(l => l());
};

export const prayerStore = {
  getAll: () => [...prayers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  
  getById: (id: string) => prayers.find(p => p.id === id),
  
  add: (prayer: Omit<Prayer, 'id' | 'count' | 'createdAt'>) => {
    const newPrayer: Prayer = {
      ...prayer,
      id: Math.random().toString(36).substr(2, 9),
      count: 0,
      createdAt: new Date().toISOString(),
    };
    prayers = [newPrayer, ...prayers];
    notify();
    return newPrayer;
  },
  
  incrementCount: (id: string) => {
    prayers = prayers.map(p => 
      p.id === id ? { ...p, count: p.count + 1 } : p
    );
    notify();
  },
  
  subscribe: (callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
};

// React hook for consuming the store
export function usePrayers() {
  const [data, setData] = useState(prayerStore.getAll());

  useEffect(() => {
    const unsubscribe = prayerStore.subscribe(() => {
      setData(prayerStore.getAll());
    });
    return unsubscribe;
  }, []);

  return data;
}

export function usePrayer(id: string) {
  const [prayer, setPrayer] = useState(prayerStore.getById(id));

  useEffect(() => {
    setPrayer(prayerStore.getById(id));
    const unsubscribe = prayerStore.subscribe(() => {
      setPrayer(prayerStore.getById(id));
    });
    return unsubscribe;
  }, [id]);

  return prayer;
}
