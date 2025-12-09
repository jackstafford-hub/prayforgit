import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, UserCircle, Flag } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";
import { getPrayerById, incrementPrayerCount } from "@/lib/api";
import type { Prayer } from "@shared/schema";

export default function PrayerDetail() {
  const [, params] = useRoute("/prayer/:id");
  const id = params?.id || "";
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [hasPrayed, setHasPrayed] = useState(false);

  useEffect(() => {
    const fetchPrayer = async () => {
      try {
        const data = await getPrayerById(id);
        setPrayer(data);
      } catch (error) {
        console.error("Failed to fetch prayer:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchPrayer();
    }
  }, [id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!prayer) {
    return <div>Prayer not found</div>;
  }

  const handlePray = async () => {
    if (!hasPrayed) {
      try {
        const updated = await incrementPrayerCount(id);
        setPrayer(updated);
        setHasPrayed(true);
        toast({
          title: "Prayer sent",
          description: "You have joined in prayer for this cause.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to record prayer. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);
  const remaining = prayer.goal - prayer.count;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          {/* Left Column: Content */}
          <div className="space-y-8">
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-foreground text-balance">
              {prayer.title}
            </h1>

            {/* Hero Image Area */}
            <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden relative shadow-sm">
              <div 
                className="absolute inset-0 transition-transform duration-700 hover:scale-105"
                style={{ 
                  backgroundImage: `url(${prayer.imageUrl || bgTexture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} 
              />
            </div>

            <div className="flex items-center gap-3 py-4 border-b">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-sm">
                <span className="font-bold block">{prayer.author}</span>
                <span className="text-muted-foreground">started this prayer request</span>
              </div>
            </div>

            <div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {prayer.aiSummary ? (
                <>
                  <h3 className="font-serif text-2xl font-bold mb-4 text-foreground">The Issue</h3>
                  {prayer.aiSummary}
                </>
              ) : (
                prayer.description
              )}
            </div>
            
            <div className="pt-8 flex gap-4 justify-center lg:justify-start">
               <Button variant="ghost" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 text-sm">
                 <Flag className="w-4 h-4 mr-2" />
                 Report this policy violation
               </Button>
            </div>
          </div>

          {/* Right Column: Sticky Sidebar (Action) */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-serif">{prayer.count.toLocaleString()}</span>
                  <span className="text-muted-foreground font-medium">prayers</span>
                </div>
                <Progress value={percentage} className="h-2.5" indicatorClassName="bg-primary" />
                <div className="flex justify-between text-sm text-muted-foreground font-medium">
                  <span>{percentage.toFixed(0)}% of goal</span>
                  <span>{prayer.goal.toLocaleString()} goal</span>
                </div>
                <p className="text-sm text-muted-foreground pt-1">
                  <span className="font-bold text-foreground">{remaining.toLocaleString()}</span> more needed to reach the next milestone!
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  onClick={handlePray}
                  className={`w-full h-12 text-lg font-bold rounded-full shadow-md transition-all ${
                    hasPrayed 
                      ? 'bg-secondary text-foreground hover:bg-secondary/80' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20'
                  }`}
                >
                  {hasPrayed ? "You prayed!" : "Pray for this"}
                </Button>
                
                <div className="text-xs text-muted-foreground text-center px-4">
                  By clicking "Pray for this", you agree to stand in agreement with {prayer.author} and our <a href="#" className="underline">Community Guidelines</a>.
                </div>
              </div>

              {hasPrayed && (
                <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-bold mb-3">Help this prayer reach more people</h4>
                  <Button variant="outline" className="w-full mb-2">Share on WhatsApp</Button>
                  <Button variant="outline" className="w-full">Copy Link</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
