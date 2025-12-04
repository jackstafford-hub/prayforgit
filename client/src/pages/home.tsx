import { usePrayers } from "@/lib/store";
import { PrayerCard } from "@/components/prayer-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";

export default function Home() {
  const prayers = usePrayers();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div 
          className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none"
          style={{ 
            backgroundImage: `url(${bgTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} 
        />
        
        <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-6 rounded-full bg-accent/50 text-accent-foreground text-xs font-medium tracking-wide uppercase">
            Pray with others. Right now.
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-8 text-balance">
            PrayForChange.org
          </h1>
          
          <div className="prose prose-lg mx-auto text-muted-foreground leading-relaxed mb-10 max-w-xl">
            <p>
              “When faced with injustice or suffering, Jesus didn’t collect signatures—He taught us to pray.
              You’ve started petitions hoping someone else would help. Now invite God into the situation.
            </p>
            <p className="mt-4">
              PrayForChange connects you with a community that believes prayer still works miracles.
              Share your burden, receive a beautiful prayer for your cause, and watch what happens when God’s people unite in prayer.”
            </p>
          </div>
          
          <Link href="/create">
            <Button size="lg" className="font-medium text-base h-12 px-8 shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground hover:bg-primary/90">
              Add a Prayer
            </Button>
          </Link>
        </div>
      </div>

      {/* Feed Section */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl text-foreground">Recent Prayers</h2>
          <Link href="/create">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <Plus className="w-4 h-4" />
              Add Yours
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {prayers.map(prayer => (
            <PrayerCard key={prayer.id} prayer={prayer} />
          ))}
          
          {prayers.length === 0 && (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No prayers yet. Be the first to share.</p>
              <Link href="/create">
                <Button variant="outline">Add a Prayer</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
