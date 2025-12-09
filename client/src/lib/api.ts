import type { Prayer, InsertPrayer } from "@shared/schema";

export async function generatePrayerContent(title: string, description?: string) {
  const response = await fetch('/api/generate-prayer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate prayer content');
  }

  return response.json() as Promise<{
    aiSummary: string;
    recitablePrayer: string;
    imageUrl: string;
  }>;
}

export async function getPrayers(): Promise<Prayer[]> {
  const response = await fetch('/api/prayers');
  if (!response.ok) {
    throw new Error('Failed to fetch prayers');
  }
  return response.json();
}

export async function getPrayerById(id: string): Promise<Prayer> {
  const response = await fetch(`/api/prayers/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch prayer');
  }
  return response.json();
}

export async function createPrayer(prayer: InsertPrayer): Promise<Prayer> {
  const response = await fetch('/api/prayers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prayer),
  });

  if (!response.ok) {
    throw new Error('Failed to create prayer');
  }

  return response.json();
}

export async function incrementPrayerCount(id: string): Promise<Prayer> {
  const response = await fetch(`/api/prayers/${id}/pray`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to increment prayer count');
  }

  return response.json();
}
