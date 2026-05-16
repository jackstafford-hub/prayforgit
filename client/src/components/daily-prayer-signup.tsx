import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export function DailyPrayerSignup() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');

  if (authLoading || isAuthenticated) return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubscribeStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSubscribeStatus('error'); return; }
      if (data.status === 'already_active') setSubscribeStatus('already');
      else setSubscribeStatus('success');
    } catch { setSubscribeStatus('error'); }
  };

  return (
    <div className="bg-rose-50/60 border-y py-12">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl text-center">
        {subscribeStatus === 'success' || subscribeStatus === 'already' ? (
          <div className="space-y-2">
            <p className="text-lg font-serif font-semibold text-foreground" data-testid="text-subscribe-confirmation">
              {subscribeStatus === 'already'
                ? "You're already subscribed."
                : "You're in. Watch for your first prayer tomorrow morning."}
            </p>
            <p className="text-sm text-muted-foreground">One prayer. Every day. For the world's most urgent crisis.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">
              Every morning, a prayer for the world's most urgent crisis.
            </h2>
            <p className="text-muted-foreground mb-6">
              Join people in over 190 countries. One email. One prayer. Every day.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Your email address"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="h-11 rounded-full px-5 border-2 focus-visible:ring-0 focus-visible:border-primary"
                disabled={subscribeStatus === 'loading'}
                required
                data-testid="input-email-subscribe"
              />
              <Button
                type="submit"
                disabled={subscribeStatus === 'loading'}
                className="h-11 rounded-full px-6 bg-primary hover:bg-primary/90 shrink-0"
                data-testid="button-join-daily-prayer"
              >
                {subscribeStatus === 'loading' ? 'Joining\u2026' : 'Join the Daily Prayer'}
              </Button>
            </form>
            {subscribeStatus === 'error' && (
              <p className="mt-3 text-sm text-destructive" data-testid="text-subscribe-error">Something went wrong. Please try again.</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground/70">
              <a
                href="/rss/daily-crisis.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-muted-foreground transition-colors"
                data-testid="link-rss-feed"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
                </svg>
                RSS feed
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
