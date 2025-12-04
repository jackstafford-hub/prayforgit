import { useRoute, Link } from "wouter";
import { usePrayer, prayerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Heart, Share2, Mail, MessageCircle } from "lucide-react";
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-serif mb-4">Prayer not found</h2>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
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

  const shareUrl = window.location.href;
  const whatsappText = `Join me in prayer: ${prayer.title}\n${shareUrl}`;
  const mailSubject = `Pray with me for ${prayer.title}`;
  const mailBody = `Here is a prayer intention I'm supporting:\n\n${prayer.title}\n${shareUrl}`;

  return (
    <div className="min-h-screen bg-background">
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none z-0"
        style={{ 
          backgroundImage: `url(${bgTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} 
      />
      
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>
        </Link>

        <article className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Posted {formatDistanceToNow(new Date(prayer.createdAt))} ago</span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl leading-tight text-foreground text-balance">
              {prayer.title}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {prayer.description || "No additional details provided."}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 py-8">
            <Button 
              size="lg" 
              onClick={handlePray}
              className={`h-16 px-8 rounded-full text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 ${
                hasPrayed 
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Heart className={`mr-3 w-6 h-6 ${hasPrayed ? 'fill-current' : ''}`} />
              {hasPrayed ? "You prayed for this" : "Pray Now"}
            </Button>
            
            <div className="text-center">
              <span className="text-3xl font-serif font-medium block mb-1">
                {prayer.count}
              </span>
              <span className="text-sm text-muted-foreground uppercase tracking-widest">
                People Praying
              </span>
            </div>
          </div>

          <Card className="bg-muted/30 border-none">
            <CardContent className="pt-6">
              <h3 className="font-serif text-lg mb-4 text-center">Invite others to pray</h3>
              <div className="flex justify-center gap-4">
                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </a>
                
                <a href={`mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}>
                  <Button variant="outline" className="gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                </a>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Link copied" });
                  }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
