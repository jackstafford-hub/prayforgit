import type { Prayer, InsertPrayer } from "@shared/schema";

export async function generatePrayerContent(title: string, description?: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  
  try {
    const response = await fetch('/api/generate-prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to generate prayer content');
    }

    return response.json() as Promise<{
      aiSummary: string;
      recitablePrayer: string;
      imageUrl: string;
    }>;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

export async function getPrayers(): Promise<Prayer[]> {
  const response = await fetch('/api/prayers');
  if (!response.ok) {
    throw new Error('Failed to fetch prayers');
  }
  const data = await response.json();
  // Convert null to undefined for optional fields
  return data.map((p: any) => ({
    ...p,
    description: p.description ?? undefined,
    aiSummary: p.aiSummary ?? undefined,
    recitablePrayer: p.recitablePrayer ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
  }));
}

export async function getPrayerById(id: string): Promise<Prayer> {
  const response = await fetch(`/api/prayers/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch prayer');
  }
  const data = await response.json();
  // Convert null to undefined for optional fields
  return {
    ...data,
    description: data.description ?? undefined,
    aiSummary: data.aiSummary ?? undefined,
    recitablePrayer: data.recitablePrayer ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
  };
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
