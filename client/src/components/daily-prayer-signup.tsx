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
          </>
        )}
      </div>
    </div>
  );
}
