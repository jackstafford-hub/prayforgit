import { useRoute, Link } from "wouter";
import { usePrayer, prayerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, UserCircle, Flag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";

export default function PrayerDetail() {
  const [, params] = useRoute("/prayer/:id");
  const id = params?.id || "";
  const prayer = usePrayer(id);
  const { toast } = useToast();
  const [hasPrayed, setHasPrayed] = useState(false);

  if (!prayer) {
    return <div>Loading...</div>; // Simplified for brevity
  }

  const handlePray = () => {
    if (!hasPrayed) {
      prayerStore.incrementCount(id);
      setHasPrayed(true);
      toast({
        title: "Prayer sent",
        description: "You have joined in prayer for this cause.",
      });
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
            <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden relative">
              <div 
                className="absolute inset-0 opacity-50"
                style={{ 
                  backgroundImage: `url(${bgTexture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }} 
              />
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 font-serif italic text-2xl">
                Prayer Focus Image
              </div>
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
              {prayer.description}
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
