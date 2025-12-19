import { PrayerCard } from "@/components/prayer-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getPrayers } from "@/lib/api";
import type { Prayer } from "@shared/schema";

export default function Browse() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          ) : prayers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No prayers yet. Be the first to start one!</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-8">{prayers.length} prayer requests</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prayers.map(prayer => (
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
