import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DailyPrayerSignup } from "@/components/daily-prayer-signup";
import type { Prayer } from "@shared/schema";
import { Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function CrisisPrayerSpotlight() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: prayer, isLoading } = useQuery<Prayer | null>({
    queryKey: ["/api/prayers/latest-crisis"],
    queryFn: () =>
      fetch("/api/prayers/latest-crisis").then((r) => {
        if (!r.ok) return null;
        return r.json();
      }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !prayer) return null;

  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);
  const rawSummary = (prayer.aiSummary || prayer.description || "").replace(/\n+/g, " ").trim();
  const firstSentence = rawSummary.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? rawSummary.slice(0, 160);
  const showSignup = !authLoading && !isAuthenticated;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="container mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-stretch">

          {/* Crisis prayer card */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                Today's Crisis Prayer
              </span>
            </div>

            <div className="flex flex-col sm:flex-row bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              {prayer.imageUrl && (
                <div
                  className="sm:w-56 h-48 sm:h-auto shrink-0 bg-muted"
                  style={{
                    backgroundImage: `url(${prayer.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  data-testid="img-crisis-prayer"
                />
              )}

              <div className="flex flex-col justify-between p-6 flex-1 min-w-0">
                <div>
                  <h2
                    className="font-serif text-2xl font-bold leading-tight mb-3 text-foreground"
                    data-testid="text-crisis-prayer-title"
                  >
                    {prayer.title}
                  </h2>
                  {firstSentence && (
                    <p
                      className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3"
                      data-testid="text-crisis-prayer-summary"
                    >
                      {firstSentence}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-foreground" data-testid="text-crisis-prayer-count">
                        {prayer.count.toLocaleString()}{" "}
                        <span className="font-normal text-muted-foreground">prayers</span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {prayer.goal.toLocaleString()} goal
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className="h-2 bg-amber-100"
                      indicatorClassName="bg-amber-500"
                    />
                  </div>

                  <Link href={`/prayer/${prayer.slug || prayer.id}`}>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6"
                      data-testid="button-crisis-pray-now"
                    >
                      Pray Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Email signup panel — hidden for authenticated users */}
          {showSignup && (
            <div className="lg:w-80 shrink-0 flex items-center">
              <div className="w-full bg-white rounded-xl border border-amber-200 shadow-sm p-6">
                <DailyPrayerSignup variant="inline" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
