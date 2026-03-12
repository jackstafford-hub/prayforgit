import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPrayerById, getPrayers, incrementPrayerCount } from "@/lib/api";
import type { Prayer, User } from "@shared/schema";
import { Heart, Share2, Copy, MessageCircle, Mail, X, ChevronRight, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

function getLocalCurrency(): { code: string; symbol: string } {
  const EUR = { code: 'eur', symbol: '€' };
  try {
    const timezoneCurrencyMap: Record<string, { code: string; symbol: string }> = {
      'America/New_York': { code: 'usd', symbol: '$' },
      'America/Chicago': { code: 'usd', symbol: '$' },
      'America/Denver': { code: 'usd', symbol: '$' },
      'America/Los_Angeles': { code: 'usd', symbol: '$' },
      'America/Anchorage': { code: 'usd', symbol: '$' },
      'Pacific/Honolulu': { code: 'usd', symbol: '$' },
      'Europe/London': { code: 'gbp', symbol: '£' },
      'Australia/Sydney': { code: 'aud', symbol: 'A$' },
      'Australia/Melbourne': { code: 'aud', symbol: 'A$' },
      'Australia/Perth': { code: 'aud', symbol: 'A$' },
      'Australia/Brisbane': { code: 'aud', symbol: 'A$' },
      'America/Toronto': { code: 'cad', symbol: 'C$' },
      'America/Vancouver': { code: 'cad', symbol: 'C$' },
      'Pacific/Auckland': { code: 'nzd', symbol: 'NZ$' },
      'Asia/Tokyo': { code: 'jpy', symbol: '¥' },
      'Europe/Zurich': { code: 'chf', symbol: 'CHF ' },
      'Europe/Stockholm': { code: 'sek', symbol: 'kr' },
      'Europe/Oslo': { code: 'nok', symbol: 'kr' },
      'Europe/Copenhagen': { code: 'dkk', symbol: 'kr' },
      'Europe/Warsaw': { code: 'pln', symbol: 'zł' },
      'Asia/Kolkata': { code: 'inr', symbol: '₹' },
      'America/Sao_Paulo': { code: 'brl', symbol: 'R$' },
      'America/Mexico_City': { code: 'mxn', symbol: 'MX$' },
      'Africa/Johannesburg': { code: 'zar', symbol: 'R' },
    };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timezoneCurrencyMap[tz]) {
      return timezoneCurrencyMap[tz];
    }

    const euroTimezones = [
      'Europe/Rome', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
      'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Dublin',
      'Europe/Lisbon', 'Europe/Helsinki', 'Europe/Athens', 'Europe/Tallinn',
      'Europe/Riga', 'Europe/Vilnius', 'Europe/Ljubljana', 'Europe/Bratislava',
      'Europe/Luxembourg', 'Europe/Malta', 'Europe/Nicosia',
    ];
    if (euroTimezones.includes(tz)) {
      return EUR;
    }

    const locale = navigator.language || 'en-IE';
    const parts = locale.split('-');
    const region = parts.length > 1 ? parts[1].toUpperCase() : '';
    const regionMap: Record<string, { code: string; symbol: string }> = {
      US: { code: 'usd', symbol: '$' },
      GB: { code: 'gbp', symbol: '£' },
      AU: { code: 'aud', symbol: 'A$' },
      CA: { code: 'cad', symbol: 'C$' },
      NZ: { code: 'nzd', symbol: 'NZ$' },
      JP: { code: 'jpy', symbol: '¥' },
      CH: { code: 'chf', symbol: 'CHF ' },
      SE: { code: 'sek', symbol: 'kr' },
      NO: { code: 'nok', symbol: 'kr' },
      DK: { code: 'dkk', symbol: 'kr' },
      PL: { code: 'pln', symbol: 'zł' },
      IN: { code: 'inr', symbol: '₹' },
      BR: { code: 'brl', symbol: 'R$' },
      MX: { code: 'mxn', symbol: 'MX$' },
      ZA: { code: 'zar', symbol: 'R' },
    };
    return regionMap[region] || EUR;
  } catch {
    return EUR;
  }
}

const ZERO_DECIMAL_CURRENCIES = ['jpy'];

export default function CompleteSupport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const user = authUser as User | null;
  const localCurrency = getLocalCurrency();
  
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [donating, setDonating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrayerCarousel, setShowPrayerCarousel] = useState(false);
  const [otherPrayers, setOtherPrayers] = useState<Prayer[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [prayerCounted, setPrayerCounted] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [prayerData, allPrayers] = await Promise.all([
          getPrayerById(id),
          getPrayers()
        ]);
        setPrayer(prayerData);
        setOtherPrayers(allPrayers.filter(p => p.id !== id));
      } catch (error) {
        console.error("Error loading prayer:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const confirmPrayerCounted = async () => {
    if (!id || prayerCounted) return;
    try {
      const updatedPrayer = await incrementPrayerCount(id);
      setPrayer(updatedPrayer);
      setPrayerCounted(true);
    } catch (error) {
      console.error("Error counting prayer:", error);
    }
  };

  const handleDonate = async () => {
    if (!id) return;
    setDonating(true);
    await confirmPrayerCounted();
    try {
      const response = await fetch('/api/create-donation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prayerId: id, amount: ZERO_DECIMAL_CURRENCIES.includes(localCurrency.code) ? 1 : 100, currency: localCurrency.code }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({
          title: "Donations Unavailable",
          description: data.error || "Donations are not available at this time. Please try again later.",
        });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDonating(false);
    }
  };

  const handleShare = async () => {
    await confirmPrayerCounted();
    setShowShareModal(true);
    setCurrentStep(2);
  };

  const handleSkip = async () => {
    await confirmPrayerCounted();
    setShowPrayerCarousel(true);
    setCurrentStep(3);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/prayer/${id}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share it with friends and family." });
  };

  const shareUrl = `${window.location.origin}/prayer/${id}`;
  const shareText = prayer ? `Pray for ${prayer.title} on PrayForChange.org` : "Pray with me on PrayForChange.org";

  const handleCarouselPray = async (prayerId: string) => {
    try {
      await incrementPrayerCount(prayerId);
      toast({ title: "Prayer counted!", description: "Thank you for praying." });
      if (carouselIndex < otherPrayers.length - 1) {
        setCarouselIndex(prev => prev + 1);
      } else {
        setShowPrayerCarousel(false);
        navigate(`/prayer/${id}`);
      }
    } catch (error) {
      console.error("Error counting prayer:", error);
    }
  };

  const handleCarouselNext = () => {
    if (carouselIndex < otherPrayers.length - 1) {
      setCarouselIndex(prev => prev + 1);
    } else {
      setShowPrayerCarousel(false);
      navigate(`/prayer/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prayer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Prayer not found</p>
      </div>
    );
  }

  const firstName = user?.firstName || "Friend";
  const progressPercent = Math.min((prayer.count / prayer.goal) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-center gap-4 mb-8" data-testid="step-indicator">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === currentStep
                  ? "bg-primary text-white"
                  : step < currentStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step < currentStep ? <Check className="w-5 h-5" /> : step}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8 shadow-lg">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-center mb-2">
            Complete Your Support
          </h1>
          
          <p className="text-center text-lg text-muted-foreground mb-6">
            <span className="font-semibold text-foreground">{firstName}</span>, your prayer isn't complete yet!
          </p>

          <p className="text-center text-muted-foreground mb-8">
            Real change happens when more hearts join in. Help your intention reach people who care and are ready to pray with you.
          </p>

          <div className="bg-amber-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-2 text-center">
              Help sustain PrayForChange with {localCurrency.symbol}1
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Your contribution supports the platform itself — its hosting, care and continued development — and helps us share this prayer more widely. No obligation. Only if it feels right.
            </p>
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              {prayer.count} people have already prayed with you:
            </p>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{prayer.count} prayers</span>
              <span>{prayer.goal} Next goal</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleDonate}
              disabled={donating}
              className="w-full py-6 text-lg rounded-full bg-primary hover:bg-primary/90"
              data-testid="button-donate"
            >
              {donating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Heart className="w-5 h-5 mr-2" />
              )}
              Yes, I'll make a donation
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full py-6 text-lg rounded-full"
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5 mr-2" />
              No, I'll share instead
            </Button>
          </div>

          <div className="flex justify-center gap-4 mt-6 mb-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/20px-Apple_logo_black.svg.png" alt="Apple Pay" className="h-6 opacity-40" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/40px-Google_Pay_Logo.svg.png" alt="Google Pay" className="h-6 opacity-40" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/40px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-40" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/40px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 opacity-40" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/40px-PayPal.svg.png" alt="PayPal" className="h-6 opacity-40" />
          </div>

          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground underline mt-4"
            data-testid="button-skip"
          >
            Sorry I can't do anything right now, I just want to have my prayer counted.
          </button>
        </Card>
      </div>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Share this prayer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              onClick={copyLink}
              variant="outline"
              className="flex flex-col items-center py-6 cursor-pointer"
              data-testid="button-copy-link"
            >
              <Copy className="w-6 h-6 mb-2" />
              Copy Link
            </Button>
            <Button
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank')}
              variant="outline"
              className="flex flex-col items-center py-6 cursor-pointer"
              data-testid="button-share-facebook"
            >
              <div className="w-6 h-6 mb-2 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">f</div>
              Facebook
            </Button>
            <Button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')}
              variant="outline"
              className="flex flex-col items-center py-6 cursor-pointer"
              data-testid="button-share-whatsapp"
            >
              <MessageCircle className="w-6 h-6 mb-2 text-green-500" />
              WhatsApp
            </Button>
            <Button
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')}
              variant="outline"
              className="flex flex-col items-center py-6 cursor-pointer"
              data-testid="button-share-twitter"
            >
              <X className="w-6 h-6 mb-2" />
              X (Twitter)
            </Button>
            <Button
              onClick={() => window.open(`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`I wanted to share this prayer request with you:\n\n${prayer?.title || 'A prayer request'}\n\n${shareUrl}`)}`, '_blank')}
              variant="outline"
              className="flex flex-col items-center py-6 col-span-2 cursor-pointer"
              data-testid="button-share-email"
            >
              <Mail className="w-6 h-6 mb-2" />
              Email
            </Button>
          </div>
          <Button
            onClick={() => {
              setShowShareModal(false);
              navigate(`/prayer/${id}`);
            }}
            className="w-full cursor-pointer"
            data-testid="button-share-continue"
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrayerCarousel} onOpenChange={setShowPrayerCarousel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Continue praying</DialogTitle>
          </DialogHeader>
          {otherPrayers.length > 0 && carouselIndex < otherPrayers.length && (
            <div className="py-4">
              <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-gray-100">
                {otherPrayers[carouselIndex].imageUrl && (
                  <img
                    src={otherPrayers[carouselIndex].imageUrl}
                    alt={otherPrayers[carouselIndex].title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <h3 className="font-serif text-lg font-bold mb-2">
                {otherPrayers[carouselIndex].title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {otherPrayers[carouselIndex].aiSummary || otherPrayers[carouselIndex].description}
              </p>
              <Button
                variant="link"
                onClick={() => navigate(`/prayer/${otherPrayers[carouselIndex].id}`)}
                className="p-0 h-auto text-primary cursor-pointer"
                data-testid="button-carousel-readmore"
              >
                Read more
              </Button>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => handleCarouselPray(otherPrayers[carouselIndex].id)}
                  className="flex-1 cursor-pointer"
                  data-testid="button-carousel-pray"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Pray
                </Button>
                <Button
                  onClick={handleCarouselNext}
                  variant="outline"
                  className="flex-1 cursor-pointer"
                  data-testid="button-carousel-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          {(otherPrayers.length === 0 || carouselIndex >= otherPrayers.length) && (
            <div className="py-4 text-center">
              <p className="text-muted-foreground mb-4" data-testid="text-thank-you">Thank you for praying!</p>
              <Button onClick={() => navigate('/')} className="cursor-pointer" data-testid="button-back-home">
                Back to Home
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
