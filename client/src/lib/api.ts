import type { Prayer, InsertPrayer } from "@shared/schema";

export async function generatePrayerContent(title: string, description?: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
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

export async function generateImage(title: string, aiSummary?: string): Promise<{ imageUrl: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, aiSummary }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Image generation timed out. Please try again.');
    }
    throw error;
  }
}

export async function getPrayers(): Promise<Prayer[]> {
  // Add cache-busting timestamp for mobile browsers
  const response = await fetch(`/api/prayers?_t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
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

export async function updatePrayerContent(id: string, content: { aiSummary?: string; recitablePrayer?: string }): Promise<Prayer> {
  const response = await fetch(`/api/prayers/${id}/content`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    throw new Error('Failed to update prayer content');
  }

  return response.json();
}

export async function regeneratePrayerContent(id: string, type: 'issue' | 'prayer' | 'both'): Promise<Prayer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`/api/prayers/${id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to regenerate content');
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}
