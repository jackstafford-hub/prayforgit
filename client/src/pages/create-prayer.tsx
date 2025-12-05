import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { prayerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Step = 'title' | 'story' | 'details';

export default function CreatePrayer() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parse query params to get initial title if provided
  const searchParams = new URLSearchParams(window.location.search);
  const initialTitle = searchParams.get('title') || "";

  const [step, setStep] = useState<Step>(initialTitle ? 'story' : 'title');

  const [formData, setFormData] = useState({
    title: initialTitle,
    description: "",
    author: "",
  });
  
  // Ensure form updates if URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get('title');
    if (titleParam && titleParam !== formData.title) {
       setFormData(prev => ({ ...prev, title: titleParam }));
       if (step === 'title') setStep('story');
    }
  }, []);

  const handleStoryContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('details');
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

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    prayerStore.add({
      title: formData.title,
      description: formData.description,
      author: formData.author || "Anonymous",
    });

    toast({
      title: "Prayer Published",
      description: "Your prayer request has been shared with the community.",
    });

    setIsSubmitting(false);
    setLocation("/");
  };

  const renderStep = () => {
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
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90"
                >
                  Continue
                </Button>
              </div>
            </form>
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
                <div className="p-4 bg-muted/30 rounded-lg border space-y-1">
                  <div className="font-serif font-medium text-lg">{formData.title}</div>
                  {formData.description && (
                     <div className="text-muted-foreground text-sm line-clamp-2">{formData.description}</div>
                  )}
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
                  onClick={() => setStep('story')}
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
        <Link href="/">
          <Button variant="ghost" className="mb-8 pl-0 hover:bg-transparent hover:text-primary text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>
        </Link>

        {renderStep()}
      </div>
    </div>
  );
}
