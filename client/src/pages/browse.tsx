import { PrayerCard } from "@/components/prayer-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getPrayers } from "@/lib/api";
import { PRAYER_CATEGORIES } from "@shared/schema";
import type { Prayer } from "@shared/schema";

const CATEGORIES = ["All", ...PRAYER_CATEGORIES];

export default function Browse() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setError(null);
        const data = await getPrayers();
        setPrayers(data);
      } catch (err) {
        console.error("Failed to fetch prayers:", err);
        setError("Unable to load prayers. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrayers();
  }, []);

  const filteredPrayers = useMemo(() => {
    if (activeCategory === "All") return prayers;
    return prayers.filter(p => p.topic === activeCategory);
  }, [prayers, activeCategory]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      {/* Header */}
      <div className="bg-muted/30 py-12 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Browse All Prayers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore prayer requests from our community. Each prayer represents someone's hope for change. 
            Join them in faith and multiply the power of prayer.
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prayers Grid */}
      <div className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                data-testid="button-retry-browse"
              >
                Try again
              </Button>
            </div>
          ) : filteredPrayers.length === 0 ? (
            <div className="text-center py-16">
              {activeCategory === "All" ? (
                <p className="text-xl text-muted-foreground">No prayers yet. Be the first to start one!</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xl text-muted-foreground">No prayers in "{activeCategory}" yet.</p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveCategory("All")}
                    data-testid="button-show-all"
                  >
                    Show all prayers
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-8" data-testid="text-results-count">
                {filteredPrayers.length} prayer {filteredPrayers.length === 1 ? 'request' : 'requests'}
                {activeCategory !== "All" && ` in ${activeCategory}`}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrayers.map(prayer => (
                  <PrayerCard key={prayer.id} prayer={prayer} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
