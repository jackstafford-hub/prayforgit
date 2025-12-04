import { usePrayers } from "@/lib/store";
import { PrayerCard } from "@/components/prayer-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const prayers = usePrayers();

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-background py-20 md:py-24 border-b">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.1] tracking-tight mb-6 text-balance">
            Turn one prayer into hundreds
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            PrayForChange is the world’s platform for spiritual support. 
            Share your burden and watch God's people unite.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="h-14 px-8 rounded-full text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all">
                Start a prayer
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-lg font-medium border-2">
              Browse prayers
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section - Common in Change.org style sites */}
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 md:px-6 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
          <div>
            <div className="text-3xl font-bold font-serif text-primary">2,493</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Prayers Today</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-serif text-primary">15,201</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Praying Now</div>
          </div>
          <div>
            <div className="text-3xl font-bold font-serif text-primary">194</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Countries</div>
          </div>
        </div>
      </div>

      {/* Feed Section */}
      <div className="bg-muted/10 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-serif font-bold mb-8">Trending prayers</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prayers.map(prayer => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" className="rounded-full px-8">
              See more prayers
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
