import { storage } from "./storage";
import { sendDailyDigestEmail } from "./emailService";

export function startDailyDigestJob() {
  const getUTCDateString = (date: Date) => date.toISOString().split('T')[0];

  const runDigest = async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateStr = getUTCDateString(yesterday);

    console.log(`[DIGEST] Running daily digest for ${dateStr}`);

    try {
      const dailyCounts = await storage.getDailyPrayerCountsForDate(dateStr);

      if (dailyCounts.length === 0) {
        console.log(`[DIGEST] No prayers recorded for ${dateStr}, skipping digest`);
        return;
      }

      const authorPrayers: Map<string, { title: string; newCount: number; totalCount: number }[]> = new Map();
      const authorInfo: Map<string, { email: string; firstName: string }> = new Map();

      for (const dc of dailyCounts) {
        if (dc.count === 0) continue;

        const prayer = await storage.getPrayerById(dc.prayerId);
        if (!prayer || !prayer.authorId) continue;

        const user = await storage.getUser(prayer.authorId);
        if (!user || !user.email) continue;

        if (!authorPrayers.has(prayer.authorId)) {
          authorPrayers.set(prayer.authorId, []);
          authorInfo.set(prayer.authorId, { email: user.email, firstName: user.firstName || 'Friend' });
        }

        authorPrayers.get(prayer.authorId)!.push({
          title: prayer.title,
          newCount: dc.count,
          totalCount: prayer.count,
        });
      }

      const authorIds = Array.from(authorPrayers.keys());
      for (const authorId of authorIds) {
        const digests = authorPrayers.get(authorId)!;
        const info = authorInfo.get(authorId)!;
        await sendDailyDigestEmail(info.email, info.firstName, digests);
      }

      await storage.resetDailyPrayerCounts(dateStr);
      console.log(`[DIGEST] Daily digest completed for ${dateStr}`);
    } catch (error: any) {
      console.error(`[DIGEST] Error running daily digest:`, error?.message || error);
    }
  };

  const scheduleNextRun = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(8, 0, 0, 0);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const msUntilNext = next.getTime() - now.getTime();
    console.log(`[DIGEST] Next daily digest scheduled in ${Math.round(msUntilNext / 1000 / 60)} minutes (at ${next.toISOString()})`);

    setTimeout(async () => {
      await runDigest();
      setInterval(runDigest, 24 * 60 * 60 * 1000);
    }, msUntilNext);
  };

  scheduleNextRun();
}
