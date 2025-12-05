import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { prayerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Wand2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Import mock generated images
import gen1 from "@assets/generated_images/abstract_rays_of_light_through_clouds.png";
import gen2 from "@assets/generated_images/peaceful_calm_water_at_sunrise.png";
import gen3 from "@assets/generated_images/green_sprout_growing_in_sunlight.png";

const MOCK_IMAGES = [gen1, gen2, gen3];

type Step = 'title' | 'story' | 'review' | 'details';

export default function CreatePrayer() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const initialTitle = searchParams.get('title') || "";

  const [step, setStep] = useState<Step>(initialTitle ? 'story' : 'title');

  const [formData, setFormData] = useState({
    title: initialTitle,
    description: "",
    author: "",
    aiSummary: "",
    recitablePrayer: "",
    imageUrl: ""
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get('title');
    if (titleParam && titleParam !== formData.title) {
       setFormData(prev => ({ ...prev, title: titleParam }));
       if (step === 'title') setStep('story');
    }
  }, []);

  const generateAIContent = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomImage = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
    
    // Mock logic to create "content" from input
    const mockSummary = `Praying for ${formData.title.toLowerCase()}. Seeking God's intervention and peace in this situation.`;
    const mockPrayer = `Heavenly Father, we come before You today to lift up this request for ${formData.title.toLowerCase()}. We ask that You would intervene in this situation. Bring Your comfort, Your guidance, and Your healing power. We trust in Your perfect timing and Your unfailing love. In Jesus' name, Amen.`;

    setFormData(prev => ({
      ...prev,
      imageUrl: randomImage,
      aiSummary: mockSummary,
      recitablePrayer: mockPrayer
    }));
    
    setIsGenerating(false);
    setStep('review');
  };

  const handleStoryContinue = (e: React.FormEvent) => {
    e.preventDefault();
    generateAIContent();
  };

  const handleTitleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      setStep('story');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    prayerStore.add({
      title: formData.title,
      description: formData.description,
      author: formData.author || "Anonymous",
      imageUrl: formData.imageUrl,
      aiSummary: formData.aiSummary,
      recitablePrayer: formData.recitablePrayer
    });

    toast({
      title: "Prayer Published",
      description: "Your prayer request has been shared with the community.",
    });

    setIsSubmitting(false);
    setLocation("/");
  };

  const renderStep = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
            <Wand2 className="w-16 h-16 text-primary relative z-10 animate-bounce" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-medium">Crafting your prayer...</h2>
            <p className="text-muted-foreground">Our AI is summarizing your story and finding a beautiful image.</p>
          </div>
        </div>
      );
    }

    switch (step) {
      case 'title':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl font-bold">Start a prayer</h1>
              <p className="text-muted-foreground">What do you want others to pray for with you?</p>
            </div>
            <form onSubmit={handleTitleContinue} className="space-y-6">
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="e.g., Healing for my sister"
                  required
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-14 text-lg px-4"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90">
                Continue
              </Button>
            </form>
          </div>
        );

      case 'story':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Before you finish</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Sharing a little of your own story helps deepen the prayer.
              </p>
            </div>
            
            <form onSubmit={handleStoryContinue} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-medium">
                  What makes this prayer personal for you? (Optional)
                </Label>
                <Textarea
                  id="description"
                  autoFocus
                  placeholder="Tell us more about the situation..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[200px] text-base p-4 resize-none bg-background"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('title')}
                  className="flex-1 h-12 text-base"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Prayer
                </Button>
              </div>
            </form>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Review your prayer</h1>
              <p className="text-muted-foreground">We've created this for you. You can edit it if you like.</p>
            </div>

            <div className="space-y-6">
              {/* A) Header Image */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Generated Header Image</Label>
                <div className="aspect-video w-full rounded-xl overflow-hidden relative shadow-md group">
                   <img src={formData.imageUrl} alt="Generated header" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm" onClick={generateAIContent} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> Regenerate
                      </Button>
                   </div>
                </div>
              </div>

              {/* B) Summary */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Story Summary</Label>
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-foreground/90 leading-relaxed">{formData.aiSummary}</p>
                </div>
              </div>

              {/* C) Prayer to Recite */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Community Prayer</Label>
                <div className="p-6 bg-primary/5 rounded-lg border border-primary/10">
                   <p className="font-serif text-lg italic leading-relaxed text-primary/90">
                     "{formData.recitablePrayer}"
                   </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
               <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('story')}
                  className="flex-1 h-12 text-base"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep('details')}
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90"
                >
                  Looks Good
                </Button>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Almost done</h1>
              <p className="text-muted-foreground text-lg">
                Who is asking for prayer?
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                 <div className="p-4 bg-muted/30 rounded-lg border flex gap-4 items-start">
                    <div className="h-16 w-24 shrink-0 rounded-md overflow-hidden bg-muted">
                       <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                       <div className="font-serif font-medium text-lg line-clamp-1">{formData.title}</div>
                       <div className="text-muted-foreground text-sm line-clamp-2">{formData.aiSummary}</div>
                    </div>
                 </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Your Name</Label>
                  <Input
                    id="author"
                    autoFocus
                    placeholder="John Doe"
                    required
                    value={formData.author}
                    onChange={e => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('review')}
                  className="flex-1 h-12 text-base"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Publishing..." : "Publish Prayer"}
                </Button>
              </div>
            </form>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        {step === 'title' && (
          <Link href="/">
            <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary text-muted-foreground gap-2">
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
          </Link>
        )}

        {renderStep()}
      </div>
    </div>
  );
}
