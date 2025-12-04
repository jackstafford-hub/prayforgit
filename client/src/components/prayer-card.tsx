import { Prayer, prayerStore } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PrayerCardProps {
  prayer: Prayer;
}

export function PrayerCard({ prayer }: PrayerCardProps) {
  const [hasPrayed, setHasPrayed] = useState(false);
  const { toast } = useToast();

  const handlePray = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!hasPrayed) {
      prayerStore.incrementCount(prayer.id);
      setHasPrayed(true);
      toast({
        title: "Prayer sent",
        description: "Thank you for standing in agreement.",
        duration: 3000,
      });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/prayer/${prayer.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share this link with others to join in prayer.",
    });
  };

  return (
    <Link href={`/prayer/${prayer.id}`}>
      <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-xl leading-tight group-hover:text-primary transition-colors">
            {prayer.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {prayer.description || "No description provided."}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-2">
          <Button 
            variant={hasPrayed ? "secondary" : "outline"} 
            size="sm" 
            onClick={handlePray}
            className={`gap-2 transition-all ${hasPrayed ? 'bg-accent text-accent-foreground border-accent' : 'hover:border-primary/50'}`}
          >
            <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-current' : ''}`} />
            {hasPrayed ? "Prayed" : "Pray Now"}
            <span className="ml-1 text-xs opacity-70 font-normal">
              {prayer.count}
            </span>
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
