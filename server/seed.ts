import { db } from "./db";
import { prayers } from "@shared/schema";

const SEED_PRAYERS = [
  {
    title: 'Healing for my mother fighting cancer',
    description: 'She has been battling stage 4 cancer for months. The doctors say it is aggressive, but we believe in a God who heals. We are praying for a complete recovery, strength for the chemotherapy, and peace for our family during this storm. Please join us in asking for a miracle.',
    aiSummary: 'Seeking divine healing and strength for a mother battling aggressive stage 4 cancer, and peace for her family.',
    recitablePrayer: 'Lord, we lift up this mother to You. We ask for Your healing touch to remove every cancer cell. Give her strength for the journey and surround her family with Your supernatural peace. We believe in Your power to heal. Amen.',
    author: 'Sarah Jenkins',
    count: 1243,
    goal: 1500,
    topic: 'Health',
  },
  {
    title: 'Restore my marriage and bring peace to our home',
    description: 'We are going through a separation and things look impossible. I am asking for prayers for reconciliation, forgiveness, and for love to be restored. We have two children who need their parents together.',
    author: 'Michael Brown',
    count: 567,
    goal: 1000,
    topic: 'Family',
  },
  {
    title: 'Prayer for a breakthrough in employment',
    description: 'I have been unemployed for 6 months and savings are running out. I have a final interview on Tuesday. Praying for favor, clarity, and the right door to open for me to provide for my family.',
    author: 'David Wilson',
    count: 89,
    goal: 100,
    topic: 'Employment',
  },
  {
    title: 'Peace for the conflict in the Middle East',
    description: 'Praying for an end to the violence, protection for innocent civilians, and wisdom for leaders to find a path to lasting peace.',
    author: 'Grace Community',
    count: 15420,
    goal: 20000,
    topic: 'World Peace',
  }
];

export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    // Check if we already have prayers
    const existing = await db.select().from(prayers).limit(1);
    if (existing.length > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }

    // Insert seed data
    await db.insert(prayers).values(SEED_PRAYERS);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
