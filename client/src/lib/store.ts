import { useState, useEffect } from 'react';

import prayer1 from "@assets/generated_images/older_woman_hands_holding_bible_in_hospital.png";
import prayer2 from "@assets/generated_images/sad_couple_sitting_apart_at_kitchen_table.png";
import prayer3 from "@assets/generated_images/stressed_man_looking_at_bills.png";
import prayer4 from "@assets/generated_images/candlelight_vigil_for_peace.png";

export interface Prayer {
  id: string;
  title: string;
  description?: string;
  author: string;
  count: number;
  goal: number;
  createdAt: string;
  topic: string;
  imageUrl?: string;
  aiSummary?: string;
  recitablePrayer?: string;
}

// Initial seed data to make the prototype look alive
const INITIAL_PRAYERS: Prayer[] = [
  {
    id: '1',
    title: 'Healing for my mother fighting cancer',
    description: 'She has been battling stage 4 cancer for months. The doctors say it is aggressive, but we believe in a God who heals. We are praying for a complete recovery, strength for the chemotherapy, and peace for our family during this storm. Please join us in asking for a miracle.',
    aiSummary: 'Seeking divine healing and strength for a mother battling aggressive stage 4 cancer, and peace for her family.',
    recitablePrayer: 'Lord, we lift up this mother to You. We ask for Your healing touch to remove every cancer cell. Give her strength for the journey and surround her family with Your supernatural peace. We believe in Your power to heal. Amen.',
    author: 'Sarah Jenkins',
    count: 1243,
    goal: 1500,
    topic: 'Health',
    createdAt: new Date(Date.now() - 10000000).toISOString(),
    imageUrl: prayer1
  },
  {
    id: '2',
    title: 'Restore my marriage and bring peace to our home',
    description: 'We are going through a separation and things look impossible. I am asking for prayers for reconciliation, forgiveness, and for love to be restored. We have two children who need their parents together.',
    author: 'Michael Brown',
    count: 567,
    goal: 1000,
    topic: 'Family',
    createdAt: new Date(Date.now() - 5000000).toISOString(),
    imageUrl: prayer2
  },
  {
    id: '3',
    title: 'Prayer for a breakthrough in employment',
    description: 'I have been unemployed for 6 months and savings are running out. I have a final interview on Tuesday. Praying for favor, clarity, and the right door to open for me to provide for my family.',
    author: 'David Wilson',
    count: 89,
    goal: 100,
    topic: 'Employment',
    createdAt: new Date(Date.now() - 2000000).toISOString(),
    imageUrl: prayer3
  },
  {
    id: '4',
    title: 'Peace for the conflict in the Middle East',
    description: 'Praying for an end to the violence, protection for innocent civilians, and wisdom for leaders to find a path to lasting peace.',
    author: 'Grace Community',
    count: 15420,
    goal: 20000,
    topic: 'World Peace',
    createdAt: new Date(Date.now() - 15000000).toISOString(),
    imageUrl: prayer4
  }
];

// Simple in-memory store with a listener pattern for this prototype
let prayers: Prayer[] = [...INITIAL_PRAYERS];
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(l => l());
};

export const prayerStore = {
  getAll: () => [...prayers].sort((a, b) => b.count - a.count), // Sort by "trending" (count)
  
  getById: (id: string) => prayers.find(p => p.id === id),
  
  add: (prayer: Omit<Prayer, 'id' | 'count' | 'createdAt' | 'goal' | 'topic'>) => {
    const newPrayer: Prayer = {
      ...prayer,
      id: Math.random().toString(36).substr(2, 9),
      count: 1, // Starts with 1 (the author)
      goal: 100,
      topic: 'General',
      author: prayer.author || 'Anonymous', // Default for now
      createdAt: new Date().toISOString(),
      imageUrl: prayer.imageUrl
    };
    prayers = [newPrayer, ...prayers];
    notify();
    return newPrayer;
  },
  
  incrementCount: (id: string) => {
    prayers = prayers.map(p => {
      if (p.id === id) {
        const newCount = p.count + 1;
        // Simple dynamic goal logic mimicking Change.org
        let newGoal = p.goal;
        if (newCount >= p.goal) {
            newGoal = p.goal * 2; // Next milestone
        }
        return { ...p, count: newCount, goal: newGoal };
      }
      return p;
    });
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
