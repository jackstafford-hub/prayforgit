import { PrayerCard } from "@/components/prayer-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { getPrayers } from "@/lib/api";
import type { Prayer } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import { DailyPrayerSignup } from "@/components/daily-prayer-signup";

const FAQ_ITEMS = [
  {
    question: "What is PrayForChange?",
    answer: "PrayForChange is a global platform where anyone can start a prayer for a person, a cause, or a world event \u2014 and invite others to pray alongside them. It is interfaith and open to everyone, regardless of tradition or belief.",
  },
  {
    question: "How does collective prayer work on this platform?",
    answer: "You describe what you want the world to pray for. Our AI generates a prayer in a universalist, interfaith style. Others can then click 'I prayed for this' to join you. You can see how many people across the world are praying for the same intention.",
  },
  {
    question: "Is PrayForChange interfaith?",
    answer: "Yes. PrayForChange is designed for people of all faith traditions \u2014 Christian, Muslim, Jewish, Hindu, Buddhist, and anyone who believes in the power of prayer or spiritual intention. The prayers are written in an inclusive style that speaks to the shared spiritual values across traditions.",
  },
  {
    question: "Do I need to create an account to pray?",
    answer: "You can pray for others without creating an account. To start your own prayer request and track how many people are praying for it, you will need to sign in.",
  },
  {
    question: "Is PrayForChange free to use?",
    answer: "Yes, PrayForChange is completely free.",
  },
];

export default function Home() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [, setLocation] = useLocation();
  const [prayerTopic, setPrayerTopic] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const handleStartPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (prayerTopic.trim()) {
      setLocation(`/create?title=${encodeURIComponent(prayerTopic)}`);
    } else {
      setLocation('/create');
    }
  };

  return (
    <div className="bg-background font-sans">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-background py-20 md:py-24 border-b">
        <div className="container mx-auto px-4 md:px-6 text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.1] tracking-tight mb-6 text-balance">
            Multiply the Power of your Prayers
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            PrayForChange is the world’s platform for spiritual support. 
            Share your burden and turn one prayer into thousands.
          </p>
          
          <div className="max-w-2xl mx-auto w-full mb-6">
             <form onSubmit={handleStartPrayer} className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative flex-grow">
                  <Input 
                    className="h-14 text-lg px-6 rounded-full border-2 shadow-sm focus-visible:ring-0 focus-visible:border-primary" 
                    placeholder="What should the world pray for?" 
                    value={prayerTopic}
                    onChange={(e) => setPrayerTopic(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-full text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all shrink-0">
                  Start a prayer
                </Button>
             </form>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 py-6 border-b text-center">
        <p className="text-sm text-muted-foreground">Be one of the first to join a global prayer community.</p>
      </div>

      {/* Feed Section */}
      <div className="bg-muted/10 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-serif font-bold mb-8">Trending prayers</h2>
          
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
                data-testid="button-retry-prayers"
              >
                Try again
              </Button>
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No prayers yet. Be the first to start one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayers.slice(0, 6).map(prayer => (
                <PrayerCard key={prayer.id} prayer={prayer} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/browse">
              <Button variant="outline" size="lg" className="rounded-full px-8" data-testid="button-see-more-prayers">
                See more prayers
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <DailyPrayerSignup />

      {/* FAQ Section */}
      <div className="border-t py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h2 className="text-3xl font-serif font-bold mb-10">Frequently Asked Questions</h2>
          <div className="divide-y">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="py-5">
                <button
                  className="w-full flex items-center justify-between text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  data-testid={`button-faq-${index}`}
                  aria-expanded={openFaq === index}
                >
                  <span className="font-serif font-semibold text-lg leading-snug">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === index ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === index && (
                  <p className="mt-3 text-muted-foreground leading-relaxed" data-testid={`text-faq-answer-${index}`}>
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
