import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Wand2, RefreshCw, Pencil, Check, X, Loader2, ImageIcon, Upload } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { generatePrayerContent, createPrayer, generateImage, checkPrayerTone, suggestTitle } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

// Import mock generated images
import gen1 from "@assets/generated_images/abstract_rays_of_light_through_clouds.png";
import gen2 from "@assets/generated_images/peaceful_calm_water_at_sunrise.png";
import gen3 from "@assets/generated_images/green_sprout_growing_in_sunlight.png";
import gen4 from "@assets/generated_images/hopeful_sunrise_over_mountains.png";
import gen5 from "@assets/generated_images/hands_holding_a_candle_in_darkness.png";
import gen6 from "@assets/generated_images/group_of_people_holding_hands_in_circle_abstract.png";

const MOCK_IMAGES = [gen1, gen2, gen3, gen4, gen5, gen6];

const STORY_TEMPLATES = [
  // Template 1: The "Global Movement" angle
  (title: string, desc: string) => `In today's fast-paced and ever-challenging world, I find myself reflecting on the power of prayer and its profound impact on situations like this. The need for ${title.toLowerCase()} weighs heavily on my heart. The events unfolding can often leave us feeling overwhelmed, anxious, and at times, powerless. However, I firmly believe that prayer has the transformative ability to bring about positive change and foster a sense of peace, hope, and unity.

${desc ? `This request is deeply personal to me. ${desc}\n\n` : ''}Throughout history, countless individuals and communities have turned to prayer in times of crisis and uncertainty, and it has served as a beacon of hope. Whether for guidance, healing, or strength, prayer transcends barriers and brings people together, no matter their faith or background.

I envision a future where we are united through the practice of prayer, leading to enhanced understanding, compassion, and resilience. Encouraging more people to engage in prayer for ${title.toLowerCase()} can inspire hope and action.`,

  // Template 2: The "Spiritual Battle" angle
  (title: string, desc: string) => `There are moments in life when we realize that our own strength is not enough. Facing the challenge of ${title.toLowerCase()} is one of those moments. It is a situation that calls not just for action, but for spiritual intervention.

${desc ? `My heart is heavy because ${desc}\n\n` : ''}We are told that where two or three are gathered, God is there with them. Today, I am asking you to gather with me in spirit. I am asking you to pause, to breathe, and to lift this cause up to the One who holds the world in His hands.

By joining together in prayer for ${title.toLowerCase()}, we are doing more than just wishing for a better outcome; we are actively inviting God's peace and power into the situation. We are standing in the gap.`,

  // Template 3: The "Community & Compassion" angle
  (title: string, desc: string) => `Compassion is the thread that binds us all together. When one of us hurts, we all hurt. When one of us hopes, we all hope. Today, I am reaching out to this community to ask for your prayers regarding ${title.toLowerCase()}.

${desc ? `Here is why this matters so much: ${desc}\n\n` : ''}It is easy to feel isolated when facing difficult times, but prayer reminds us that we are never truly alone. Your prayer, no matter how short, is a gift of love. It is a way of saying, "I see you, and I am with you."

Let us surround this situation with a canopy of prayer. Let us believe together for a breakthrough, for healing, and for a resolution that brings peace to everyone involved.`
];

const PRAYER_TEMPLATES = [
  (title: string) => `Heavenly Father, we come before You today to lift up this request for ${title.toLowerCase()}. We ask that You would intervene in this situation. Bring Your comfort, Your guidance, and Your healing power. We trust in Your perfect timing and Your unfailing love. In Jesus' name, Amen.`,
  (title: string) => `Lord, we bring the need for ${title.toLowerCase()} to Your throne of grace. You know every detail and every heart involved. We ask for Your wisdom to prevail and Your peace to surpass all understanding. Surround this situation with Your presence. Amen.`,
  (title: string) => `God of all comfort, we stand in agreement today for ${title.toLowerCase()}. We believe that You are able to do immeasurably more than all we ask or imagine. Pour out Your blessing and let Your will be done. We place this in Your hands. Amen.`
];

type Step = 'title' | 'personal-context' | 'review' | 'next-steps' | 'auth' | 'notifications' | 'details' | 'live' | 'share-inner' | 'share-public' | 'dashboard-intro';

export default function CreatePrayer() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: authUser, isAuthenticated } = useAuth();
  const user = authUser as User | null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customGoal, setCustomGoal] = useState(false);
  const [createdPrayerId, setCreatedPrayerId] = useState<string | null>(null);
  
  const searchParams = new URLSearchParams(window.location.search);
  const initialTitle = searchParams.get('title') || "";

  const [step, setStep] = useState<Step>(initialTitle ? 'personal-context' : 'title');

  // Get user's full name if authenticated
  const getUserFullName = () => {
    if (user?.firstName) {
      return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
    }
    return "";
  };

  const [formData, setFormData] = useState({
    title: initialTitle,
    description: "",
    author: "",
    aiSummary: "",
    recitablePrayer: "",
    imageUrl: "",
    topic: "General",
    goal: 100,
  });

  // Pre-fill author name when user authenticates
  useEffect(() => {
    if (isAuthenticated && user && !formData.author) {
      setFormData(prev => ({ ...prev, author: getUserFullName() }));
    }
  }, [isAuthenticated, user]);
  const [emailUpdates, setEmailUpdates] = useState<boolean | null>(null);
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [isEditingPrayer, setIsEditingPrayer] = useState(false);
  const [isRegeneratingIssue, setIsRegeneratingIssue] = useState(false);
  const [isRegeneratingPrayer, setIsRegeneratingPrayer] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isCheckingTone, setIsCheckingTone] = useState(false);
  const [toneWarning, setToneWarning] = useState<{ isNegative: boolean; suggestion?: string } | null>(null);
  const [isFlaggedForReview, setIsFlaggedForReview] = useState(false);
  const [toneSuggestion, setToneSuggestion] = useState<string | undefined>(undefined);
  const [originalIssue, setOriginalIssue] = useState("");
  const [originalPrayer, setOriginalPrayer] = useState("");
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<'issue' | 'prayer' | null>(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get('title');
    if (titleParam && titleParam !== formData.title) {
       setFormData(prev => ({ ...prev, title: titleParam }));
       if (step === 'title') setStep('personal-context');
    }
    
    // Restore saved prayer data after login redirect
    const savedData = localStorage.getItem('pendingPrayer');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed.formData);
        setStep(parsed.step || 'details');
        localStorage.removeItem('pendingPrayer');
      } catch (e) {
        console.error('Failed to restore prayer data:', e);
      }
    }
  }, []);

  const generateAIContent = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generatePrayerContent(formData.title, formData.description);
      
      setFormData(prev => ({
        ...prev,
        imageUrl: result.imageUrl,
        aiSummary: result.aiSummary,
        recitablePrayer: result.recitablePrayer,
        topic: result.topic || prev.topic,
      }));
      
      setStep('review');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate prayer content. Please try again.",
        variant: "destructive"
      });
      console.error("Error generating AI content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateIssue = () => {
    setRegenerateTarget('issue');
    setRegenerateInstructions("");
  };

  const regeneratePrayer = () => {
    setRegenerateTarget('prayer');
    setRegenerateInstructions("");
  };

  const handleConfirmRegenerate = async () => {
    if (!regenerateTarget) return;

    const isIssue = regenerateTarget === 'issue';
    isIssue ? setIsRegeneratingIssue(true) : setIsRegeneratingPrayer(true);

    try {
      const result = await generatePrayerContent(
        formData.title,
        formData.description,
        {
          instructions: regenerateInstructions || undefined,
          currentSummary: isIssue ? formData.aiSummary : undefined,
          currentPrayer: !isIssue ? formData.recitablePrayer : undefined,
        }
      );
      
      if (isIssue) {
        setFormData(prev => ({ ...prev, aiSummary: result.aiSummary }));
      } else {
        setFormData(prev => ({ ...prev, recitablePrayer: result.recitablePrayer }));
      }
      
      setRegenerateTarget(null);
      setRegenerateInstructions("");
    } catch (error) {
      toast({ 
        title: "Error", 
        description: `Failed to regenerate the ${isIssue ? 'story' : 'prayer'}.`, 
        variant: "destructive" 
      });
    } finally {
      isIssue ? setIsRegeneratingIssue(false) : setIsRegeneratingPrayer(false);
    }
  };

  const regenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const result = await generateImage(formData.title, formData.aiSummary);
      setFormData(prev => ({ ...prev, imageUrl: result.imageUrl }));
    } catch (error) {
      toast({ title: "Error", description: "Failed to regenerate image.", variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const startEditingIssue = () => {
    setOriginalIssue(formData.aiSummary);
    setIsEditingIssue(true);
  };

  const confirmIssueEdit = () => {
    setIsEditingIssue(false);
  };

  const cancelIssueEdit = () => {
    setFormData(prev => ({ ...prev, aiSummary: originalIssue }));
    setIsEditingIssue(false);
  };

  const startEditingPrayer = () => {
    setOriginalPrayer(formData.recitablePrayer);
    setIsEditingPrayer(true);
  };

  const confirmPrayerEdit = () => {
    setIsEditingPrayer(false);
  };

  const cancelPrayerEdit = () => {
    setFormData(prev => ({ ...prev, recitablePrayer: originalPrayer }));
    setIsEditingPrayer(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "Image must be under 8MB", variant: "destructive" });
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData(prev => ({ ...prev, imageUrl: result }));
      };
      reader.onerror = () => {
        toast({ title: "Failed to read image file", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleStoryContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingTone(true);
    try {
      const toneResult = await checkPrayerTone(formData.title, formData.description);
      if (toneResult.isNegative) {
        setToneWarning(toneResult);
        setIsCheckingTone(false);
        return;
      }
    } catch {
    }
    setIsCheckingTone(false);
    generateAIContent();
  };

  const titleSuggestRef = useRef(0);
  const handleTitleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTitle = formData.title.trim();
    if (currentTitle) {
      setStep('personal-context');
      setSuggestedTitle(null);
      setIsSuggestingTitle(true);
      const requestId = ++titleSuggestRef.current;
      try {
        const result = await suggestTitle(currentTitle);
        if (requestId !== titleSuggestRef.current) return;
        if (result.suggestedTitle && result.suggestedTitle.toLowerCase() !== currentTitle.toLowerCase()) {
          setSuggestedTitle(result.suggestedTitle);
        }
      } catch {
      } finally {
        if (requestId === titleSuggestRef.current) {
          setIsSuggestingTitle(false);
        }
      }
    }
  };

  const submitPrayer = async () => {
    setIsSubmitting(true);

    try {
      const prayerData: any = {
        title: formData.title,
        description: formData.description || undefined,
        author: formData.author || "Anonymous",
        imageUrl: formData.imageUrl || undefined,
        aiSummary: formData.aiSummary || undefined,
        recitablePrayer: formData.recitablePrayer || undefined,
        count: 1,
        goal: formData.goal,
        topic: formData.topic,
        flaggedForReview: isFlaggedForReview,
      };

      if (isFlaggedForReview && toneSuggestion) {
        prayerData.toneSuggestion = toneSuggestion;
      }

      const response = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prayerData),
      });

      if (!response.ok) {
        throw new Error('Failed to create prayer');
      }

      const newPrayer = await response.json();
      
      setCreatedPrayerId(newPrayer.id);

      toast({
        title: isFlaggedForReview ? "Prayer Submitted for Review" : "Prayer Published",
        description: isFlaggedForReview 
          ? "Your prayer has been submitted and will be reviewed by our team before being shared publicly."
          : "Your prayer request has been shared with the community.",
      });

      setStep('live');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish prayer. Please try again.",
        variant: "destructive"
      });
      console.error("Error creating prayer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPrayer();
  };

  const handleLooksGood = () => {
    if (isAuthenticated) {
      setStep('details');
    } else {
      setStep('next-steps');
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    setIsSubmitting(true);
    // Simulate auth delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setFormData(prev => ({
      ...prev,
      author: "Alex Smith", // Simulate getting name from provider
    }));
    
    toast({
      title: `Welcome back, Alex!`,
      description: `Successfully logged in with ${provider === 'google' ? 'Google' : 'Facebook'}.`,
    });
    
    setIsSubmitting(false);
    setStep('notifications');
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Prayer goal</Label>
                <p className="text-xs text-muted-foreground">How many people do you want praying for this?</p>
                <div className="flex flex-wrap gap-2">
                  {[50, 100, 500, 1000].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, goal: g })); setCustomGoal(false); }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                        !customGoal && formData.goal === g
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                      data-testid={`button-goal-${g}`}
                    >
                      {g.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomGoal(true)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                      customGoal
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                    data-testid="button-goal-custom"
                  >
                    Custom
                  </button>
                </div>
                {customGoal && (
                  <Input
                    type="number"
                    min={10}
                    max={1000000}
                    value={formData.goal}
                    onChange={e => setFormData(prev => ({ ...prev, goal: Math.max(10, parseInt(e.target.value) || 10) }))}
                    className="w-32 mt-2"
                    data-testid="input-goal-custom"
                  />
                )}
              </div>
              <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90">
                Continue
              </Button>
            </form>
          </div>
        );

      case 'personal-context':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Why is this prayer personal to you?</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Sharing a little of your own story helps deepen the prayer. (Optional)
              </p>
            </div>

            {isSuggestingTitle && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3 animate-in fade-in duration-300">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Suggesting a title improvement...</p>
              </div>
            )}

            {suggestedTitle && !isSuggestingTitle && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="title-suggestion-card">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested title</p>
                  <p className="text-base font-semibold text-foreground" data-testid="text-suggested-title">{suggestedTitle}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, title: suggestedTitle! }));
                      setSuggestedTitle(null);
                    }}
                    className="gap-2"
                    data-testid="button-accept-title"
                  >
                    <Check className="w-4 h-4" />
                    Use this title
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSuggestedTitle(null)}
                    className="gap-2"
                    data-testid="button-keep-title"
                  >
                    Keep mine
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your current title: <span className="font-medium">{formData.title}</span>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Textarea
                id="description"
                autoFocus
                placeholder="Tell us more about the situation..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[200px] text-base p-4 resize-none bg-background"
              />
            </div>

            {toneWarning?.isNegative && (
              <div data-testid="tone-warning-dialog" className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-semibold text-amber-900 dark:text-amber-200">A gentle suggestion</h3>
                  <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                    It looks like your prayer might be framed in a negative way. Prayers tend to be more powerful when they focus on what we hope <em>for</em> rather than what we're against. If you continue without changes, your prayer will be sent to our team for review before being shared publicly.
                  </p>
                </div>
                {toneWarning.suggestion && (
                  <div className="bg-white dark:bg-background rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                    <p className="text-sm text-muted-foreground mb-1">Instead, you could try:</p>
                    <p data-testid="text-tone-suggestion" className="text-base font-medium text-foreground">{toneWarning.suggestion}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    data-testid="button-revise-prayer"
                    type="button"
                    variant="outline"
                    onClick={() => { setToneWarning(null); }}
                    className="flex-1 h-10 text-sm border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    Revise My Prayer
                  </Button>
                  <Button
                    data-testid="button-continue-anyway"
                    type="button"
                    onClick={() => { setIsFlaggedForReview(true); setToneSuggestion(toneWarning?.suggestion); setToneWarning(null); generateAIContent(); }}
                    className="flex-1 h-10 text-sm"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleStoryContinue} className="space-y-6">
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
                  data-testid="button-generate-prayer"
                  type="submit"
                  disabled={isCheckingTone}
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90 gap-2"
                >
                  {isCheckingTone ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Prayer
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center pt-2">
                <Link href="/personal-prayer">
                  <span className="text-sm text-muted-foreground hover:text-primary underline cursor-pointer">
                    Is this a Personal Prayer?
                  </span>
                </Link>
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
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Header Image</Label>
                <div className="aspect-video w-full rounded-xl overflow-hidden relative shadow-md group border bg-muted">
                   {isGeneratingImage ? (
                     <div className="w-full h-full flex items-center justify-center">
                       <div className="text-center space-y-2">
                         <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                         <p className="text-sm text-muted-foreground">Generating image...</p>
                       </div>
                     </div>
                   ) : formData.imageUrl ? (
                     <>
                       <img src={formData.imageUrl} alt="Header" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="sm" onClick={regenerateImage} className="gap-2">
                            <Wand2 className="w-4 h-4" /> Generate New
                          </Button>
                          <label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <Button variant="secondary" size="sm" asChild className="gap-2 cursor-pointer">
                              <span><Upload className="w-4 h-4" /> Upload</span>
                            </Button>
                          </label>
                       </div>
                     </>
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
                       <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                       <p className="text-sm text-muted-foreground text-center">Add an image to make your prayer stand out</p>
                       <div className="flex gap-3">
                         <Button variant="outline" size="sm" onClick={regenerateImage} disabled={isGeneratingImage} className="gap-2">
                           <Wand2 className="w-4 h-4" /> Generate with AI
                         </Button>
                         <label>
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                           <Button variant="outline" size="sm" asChild className="gap-2 cursor-pointer">
                             <span><Upload className="w-4 h-4" /> Upload Image</span>
                           </Button>
                         </label>
                       </div>
                     </div>
                   )}
                </div>
              </div>

              {/* B) Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">The Story</Label>
                  <div className="flex gap-2">
                    {isEditingIssue ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={confirmIssueEdit} className="h-8 px-2">
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelIssueEdit} className="h-8 px-2">
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={startEditingIssue} className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={regenerateIssue} 
                          disabled={isRegeneratingIssue}
                          className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
                        >
                          {isRegeneratingIssue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Regenerate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6 bg-muted/30 rounded-lg border">
                  <h3 className="font-serif text-xl font-bold mb-4">The Issue</h3>
                  {isEditingIssue ? (
                    <Textarea
                      value={formData.aiSummary}
                      onChange={e => setFormData(prev => ({ ...prev, aiSummary: e.target.value }))}
                      className="min-h-[200px] text-base resize-none bg-background"
                    />
                  ) : (
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{formData.aiSummary}</p>
                  )}
                </div>
              </div>

              {/* C) Prayer to Recite */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Community Prayer</Label>
                  <div className="flex gap-2">
                    {isEditingPrayer ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={confirmPrayerEdit} className="h-8 px-2">
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelPrayerEdit} className="h-8 px-2">
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={startEditingPrayer} className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={regeneratePrayer} 
                          disabled={isRegeneratingPrayer}
                          className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
                        >
                          {isRegeneratingPrayer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Regenerate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6 bg-primary/5 rounded-lg border border-primary/10">
                   {isEditingPrayer ? (
                     <Textarea
                       value={formData.recitablePrayer}
                       onChange={e => setFormData(prev => ({ ...prev, recitablePrayer: e.target.value }))}
                       className="min-h-[120px] text-base resize-none bg-background font-serif italic"
                     />
                   ) : (
                     <p className="font-serif text-lg italic leading-relaxed text-primary/90 whitespace-pre-line">
                       "{formData.recitablePrayer}"
                     </p>
                   )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
               <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('personal-context')}
                  className="flex-1 h-12 text-base"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleLooksGood}
                  disabled={isSubmitting}
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSubmitting ? "Publishing..." : "Looks Good"}
                </Button>
            </div>
          </div>
        );

      case 'next-steps':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Your prayer is ready to inspire others.</h1>
              <p className="text-muted-foreground text-lg">Now:</p>
            </div>

            <div className="space-y-6">
              <ol className="list-decimal list-inside space-y-4 text-lg text-foreground/90 pl-1">
                <li className="pl-2"><span className="font-medium">Log in</span> to keep it saved.</li>
                <li className="pl-2"><span className="font-medium">Make any final edits</span> or additions.</li>
                <li className="pl-2"><span className="font-medium">Share it</span> with those who’ll pray alongside you.</li>
              </ol>

              <div className="p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
                It will be shown publicly on PrayForChange after it receives 5 prayers.
              </div>
              
              <div className="text-center">
                <Link href="/personal-prayer">
                  <span className="text-sm text-muted-foreground hover:text-primary underline cursor-pointer">
                    Is this a Personal Prayer?
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
               <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('review')}
                  className="flex-1 h-12 text-base"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(isAuthenticated ? 'details' : 'auth')}
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90"
                >
                  Continue
                </Button>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2 mb-8">
              <h1 className="font-serif text-3xl font-bold">Log in or sign up</h1>
            </div>

            <div className="space-y-4">
               <p className="text-center text-muted-foreground">You need an account to share your prayer with the community.</p>
               
               <Link 
                  href="/auth"
                  onClick={() => {
                    const { imageUrl: _img, ...safeFormData } = formData;
                    localStorage.setItem('pendingPrayer', JSON.stringify({ formData: safeFormData, step: 'details' }));
                  }}
                  className="flex items-center justify-center w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
                  data-testid="button-login-create"
                >
                  Create Account or Sign In
               </Link>
            </div>

            <p className="text-xs text-center text-muted-foreground px-4">
              By joining or logging in, you accept PrayForChange.org’s <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
            </p>

            <div className="flex justify-center pt-2">
               <Button 
                  variant="ghost" 
                  onClick={() => setStep('next-steps')}
                  className="text-muted-foreground"
                >
                  Back
                </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2 text-center">
              <h1 className="font-serif text-3xl font-bold">Would you like to get email updates?</h1>
              <p className="text-muted-foreground text-lg">
                Get updates via email on prayers you do and on supporting PrayForChange.org
              </p>
            </div>

            <div className="space-y-4">
              <div 
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${emailUpdates === true ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}`}
                onClick={() => setEmailUpdates(true)}
              >
                <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${emailUpdates === true ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                  {emailUpdates === true && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className="font-medium">Yes, please</span>
              </div>

              <div 
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${emailUpdates === false ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}`}
                onClick={() => setEmailUpdates(false)}
              >
                 <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${emailUpdates === false ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                  {emailUpdates === false && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className="font-medium">No, thanks</span>
              </div>
            </div>

            <Button 
              onClick={() => setStep('details')}
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
              disabled={emailUpdates === null}
            >
              CONTINUE
            </Button>

             <div className="flex justify-center pt-2">
               <Button 
                  variant="ghost" 
                  onClick={() => setStep('auth')}
                  className="text-muted-foreground"
                >
                  Back
                </Button>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold">Your prayer is ready to share with others.</h1>
            </div>

            <div className="space-y-4">
               <h3 className="text-lg font-medium">Now:</h3>
               <ul className="list-decimal list-inside space-y-3 text-lg text-muted-foreground">
                  <li><span className="text-foreground font-medium">Make any final edits or additions.</span></li>
                  <li><span className="text-foreground font-medium">Share it</span> with those who’ll pray alongside you.</li>
               </ul>
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

                {!isAuthenticated && (
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
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                 It will be shown publicly on PrayForChange.org after it receives 5 prayers.
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(isAuthenticated ? 'review' : 'notifications')}
                  className="flex-1 h-12 text-base uppercase font-bold tracking-wide"
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-bold bg-primary hover:bg-primary/90 uppercase tracking-wide" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Prayer"}
                </Button>
              </div>
            </form>
          </div>
        );

      case 'live':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10" />
            </div>
            
            <div className="space-y-4">
              <h1 className="font-serif text-4xl font-bold text-balance">
                {isFlaggedForReview ? "Your prayer has been submitted" : "Your prayer request is live!"}
              </h1>
              {isFlaggedForReview ? (
                <>
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
                    Thank you for sharing your prayer. Our team will review it before it becomes publicly visible.
                  </p>
                  <div data-testid="moderation-notice" className="p-6 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 max-w-lg mx-auto mt-6">
                    <p className="font-medium text-lg text-amber-800 dark:text-amber-200">
                      Your prayer is being reviewed to make sure it aligns with our community guidelines. You'll still be able to share it with your inner circle while we review.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
                    Now let’s take a moment to help it flourish. Think of us as your prayer companion — we’ve learned what helps.
                  </p>
                  <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 max-w-lg mx-auto mt-6">
                    <p className="font-medium text-lg text-primary/90">
                      Prayers that gather a handful of “amen”s in the first day are far more likely to spread hope and touch hearts.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-8">
              <Button 
                onClick={() => setStep('share-inner')}
                className="w-full max-w-sm h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl uppercase tracking-wide"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'share-inner':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
             <div className="space-y-4">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-balance">Begin by inviting those who nurture your spirit.</h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
                Think of the people who quietly hold you in prayer already—parents, close friends, even the neighbour who knows your story. Ask this inner circle to be the first to echo your prayer, lifting it together with you before God.
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
               <Button variant="outline" className="h-12 text-base gap-2" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/prayer/${createdPrayerId}`);
                  toast({ title: "Link copied" });
               }}>
                 Copy Link
               </Button>
               
               <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me in prayer: ${formData.title}\n${window.location.origin}/prayer/${createdPrayerId}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="h-12 text-base gap-2 w-full">
                    WhatsApp
                  </Button>
                </a>
                
                <a href={`mailto:?subject=${encodeURIComponent(`Pray with me for ${formData.title}`)}&body=${encodeURIComponent(`Here is a prayer intention I'm supporting:\n\n${formData.title}\n${window.location.origin}/prayer/${createdPrayerId}`)}`} className="w-full">
                  <Button variant="outline" className="h-12 text-base gap-2 w-full">
                    Email
                  </Button>
                </a>
            </div>

            <div className="pt-8">
              <Button 
                onClick={() => setStep('share-public')}
                className="w-full max-w-sm h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl uppercase tracking-wide"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'share-public':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
             <div className="space-y-4">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-balance">Next, it’s time to share publicly</h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
                You’re ready! The most important thing you can do today is share your prayer in relevant online communities.
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
               <Button variant="outline" className="h-12 text-base gap-2" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/prayer/${createdPrayerId}`);
                  toast({ title: "Link copied" });
               }}>
                 Copy Link
               </Button>
               
               <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/prayer/${createdPrayerId}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="h-12 text-base gap-2 w-full">
                    <svg className="h-5 w-5 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.603-2.797 4.16v1.957h5.049l-.65 3.667h-4.399v7.98h-5.012z" />
                    </svg>
                    Facebook
                  </Button>
                </a>
                
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me in prayer: ${formData.title}`)}&url=${encodeURIComponent(`${window.location.origin}/prayer/${createdPrayerId}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="h-12 text-base gap-2 w-full">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </Button>
                </a>
            </div>

            <div className="pt-8">
              <Button 
                onClick={() => setStep('dashboard-intro')}
                className="w-full max-w-sm h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl uppercase tracking-wide"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'dashboard-intro':
        const firstName = formData.author.split(' ')[0] || 'Friend';
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
            <div className="space-y-4">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-balance">That’s it, {firstName}!</h1>
              <p className="text-xl font-medium text-foreground/80">
                Your journey towards positive change has just started!
              </p>
              <p className="text-lg text-muted-foreground">
                Soon, you’ll see your first prayers.
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl p-8 border max-w-md mx-auto text-left space-y-4">
               <h3 className="font-serif text-xl font-bold text-center mb-6">Now, explore your prayer dashboard, where you can:</h3>
               <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                    <span className="text-lg">View recent prayers</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-lg">Get custom tips and content</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-lg">Send updates to supporters</span>
                  </li>
               </ul>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="w-full max-w-sm h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl uppercase tracking-wide"
              >
                Go to Dashboard
              </Button>
            </div>
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

      <Dialog open={regenerateTarget !== null} onOpenChange={(open) => !open && setRegenerateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate {regenerateTarget === 'issue' ? 'The Issue' : 'The Prayer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">What would you like to change? (Optional)</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Make it shorter, add more hope, focus on the family aspect..."
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to generate a completely fresh version.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenerateTarget(null)}
              disabled={isRegeneratingIssue || isRegeneratingPrayer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRegenerate}
              disabled={isRegeneratingIssue || isRegeneratingPrayer}
              className="gap-2"
            >
              {(isRegeneratingIssue || isRegeneratingPrayer) && <Loader2 className="w-4 h-4 animate-spin" />}
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
