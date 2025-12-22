import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, UserCircle, Flag, Pencil, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";
import { getPrayerById, updatePrayerContent, regeneratePrayerContent } from "@/lib/api";
import type { Prayer, User } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PrayerDetail() {
  const [, params] = useRoute("/prayer/:id");
  const [, navigate] = useLocation();
  const id = params?.id || "";
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [hasPrayed, setHasPrayed] = useState(false);
  const { user: authUser, isAuthenticated } = useAuth();
  const user = authUser as User | null;
  
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [isEditingPrayer, setIsEditingPrayer] = useState(false);
  const [editedIssue, setEditedIssue] = useState("");
  const [editedPrayer, setEditedPrayer] = useState("");
  const [isSavingIssue, setIsSavingIssue] = useState(false);
  const [isSavingPrayer, setIsSavingPrayer] = useState(false);
  const [isRegeneratingIssue, setIsRegeneratingIssue] = useState(false);
  const [isRegeneratingPrayer, setIsRegeneratingPrayer] = useState(false);
  
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const canEdit = isAuthenticated && prayer && (!prayer.authorId || prayer.authorId === user?.id);

  const handleSubmitReport = async () => {
    if (!prayer || !reportReason) return;
    
    setIsSubmittingReport(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prayerId: prayer.id,
          reason: reportReason,
          details: reportDetails || undefined,
          reporterEmail: reporterEmail || undefined,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to submit report");
      
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe." });
      setReportDialogOpen(false);
      setReportReason("");
      setReportDetails("");
      setReporterEmail("");
    } catch (error) {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } finally {
      setIsSubmittingReport(false);
    }
  };

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

  const handleStartEditIssue = () => {
    if (prayer) {
      setEditedIssue(prayer.aiSummary || prayer.description || "");
      setIsEditingIssue(true);
    }
  };

  const handleSaveIssue = async () => {
    if (!prayer) return;
    setIsSavingIssue(true);
    try {
      const updated = await updatePrayerContent(prayer.id, { aiSummary: editedIssue });
      setPrayer(updated);
      setIsEditingIssue(false);
      toast({ title: "Issue updated successfully" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handleStartEditPrayer = () => {
    if (prayer) {
      setEditedPrayer(prayer.recitablePrayer || "");
      setIsEditingPrayer(true);
    }
  };

  const handleSavePrayer = async () => {
    if (!prayer) return;
    setIsSavingPrayer(true);
    try {
      const updated = await updatePrayerContent(prayer.id, { recitablePrayer: editedPrayer });
      setPrayer(updated);
      setIsEditingPrayer(false);
      toast({ title: "Prayer updated successfully" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSavingPrayer(false);
    }
  };

  const handleRegenerateIssue = async () => {
    if (!prayer) return;
    setIsRegeneratingIssue(true);
    try {
      const updated = await regeneratePrayerContent(prayer.id, 'issue');
      setPrayer(updated);
      toast({ title: "Issue regenerated successfully" });
    } catch (error) {
      toast({ title: "Failed to regenerate", variant: "destructive" });
    } finally {
      setIsRegeneratingIssue(false);
    }
  };

  const handleRegeneratePrayer = async () => {
    if (!prayer) return;
    setIsRegeneratingPrayer(true);
    try {
      const updated = await regeneratePrayerContent(prayer.id, 'prayer');
      setPrayer(updated);
      toast({ title: "Prayer regenerated successfully" });
    } catch (error) {
      toast({ title: "Failed to regenerate", variant: "destructive" });
    } finally {
      setIsRegeneratingPrayer(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!prayer) {
    return <div>Prayer not found</div>;
  }

  const handlePray = () => {
    if (!hasPrayed) {
      navigate(`/support/${id}`);
    }
  };

  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);
  const remaining = prayer.goal - prayer.count;

  // Extract title from AI summary if it starts with "**Title:" pattern
  const getDisplayTitleAndCleanedSummary = () => {
    const content = prayer.aiSummary || prayer.description || "";
    const titleMatch = content.match(/^\*\*Title:\s*(.+?)\*\*/);
    if (titleMatch) {
      const extractedTitle = titleMatch[1].trim();
      const cleanedSummary = content.replace(/^\*\*Title:\s*.+?\*\*\s*/, '').trim();
      return { displayTitle: extractedTitle, cleanedSummary };
    }
    return { displayTitle: prayer.title, cleanedSummary: content };
  };

  const { displayTitle, cleanedSummary } = getDisplayTitleAndCleanedSummary();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-serif text-2xl md:text-3xl font-bold leading-tight text-foreground text-balance">
                  {displayTitle}
                </h1>
              </div>
            </div>

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

            <div className="prose prose-lg max-w-none text-foreground/80 leading-relaxed">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl font-bold text-foreground m-0">The Issue</h3>
                {canEdit && (
                  <div className="flex gap-2">
                    {!isEditingIssue && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRegenerateIssue}
                          disabled={isRegeneratingIssue}
                          className="gap-2"
                          data-testid="button-regenerate-issue"
                        >
                          {isRegeneratingIssue ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Regenerate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleStartEditIssue}
                          className="gap-2"
                          data-testid="button-edit-issue"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {isEditingIssue ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedIssue}
                    onChange={(e) => setEditedIssue(e.target.value)}
                    className="min-h-[200px] text-base leading-7"
                    data-testid="textarea-edit-issue"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditingIssue(false)}
                      disabled={isSavingIssue}
                      data-testid="button-cancel-issue"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveIssue}
                      disabled={isSavingIssue}
                      data-testid="button-save-issue"
                    >
                      {isSavingIssue ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-base leading-7">
                  {cleanedSummary}
                </div>
              )}
            </div>

            {prayer.recitablePrayer && (
              <div className="bg-muted/30 rounded-xl p-8 border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-2xl font-bold text-foreground text-center flex-1">Prayer to Recite</h3>
                  {canEdit && (
                    <div className="flex gap-2">
                      {!isEditingPrayer && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleRegeneratePrayer}
                            disabled={isRegeneratingPrayer}
                            className="gap-2"
                            data-testid="button-regenerate-prayer"
                          >
                            {isRegeneratingPrayer ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Regenerate
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleStartEditPrayer}
                            className="gap-2"
                            data-testid="button-edit-prayer"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mb-6 p-4 bg-background/50 rounded-lg border border-dashed">
                  <p className="font-medium mb-2">Instructions for Prayer:</p>
                  <p>Breathe slowly and deeply, and visualise white light descending through you. Let love and compassion fill your whole being. Raise your hands and send that loving white light from your palms and heart center to the focal point of your prayer.</p>
                </div>
                
                {isEditingPrayer ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedPrayer}
                      onChange={(e) => setEditedPrayer(e.target.value)}
                      className="min-h-[150px] text-base leading-7"
                      data-testid="textarea-edit-prayer"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditingPrayer(false)}
                        disabled={isSavingPrayer}
                        data-testid="button-cancel-prayer"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSavePrayer}
                        disabled={isSavingPrayer}
                        data-testid="button-save-prayer"
                      >
                        {isSavingPrayer ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-lg max-w-none text-foreground/90 leading-loose whitespace-pre-wrap italic text-center">
                    {prayer.recitablePrayer}
                  </div>
                )}
              </div>
            )}
            
            <div className="pt-4 flex gap-4 justify-center lg:justify-start">
               <Button 
                 variant="ghost" 
                 className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 text-sm"
                 onClick={() => setReportDialogOpen(true)}
                 data-testid="button-report"
               >
                 <Flag className="w-4 h-4 mr-2" />
                 Report this policy violation
               </Button>
            </div>
            
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Report Policy Violation</DialogTitle>
                  <DialogDescription>
                    Help us keep PrayForChange a safe and respectful community.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for report *</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger data-testid="select-report-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam or misleading</SelectItem>
                        <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                        <SelectItem value="harmful">Harmful or dangerous</SelectItem>
                        <SelectItem value="fraud">Fraud or scam</SelectItem>
                        <SelectItem value="hate">Hate speech or discrimination</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="details">Additional details (optional)</Label>
                    <Textarea
                      id="details"
                      placeholder="Please provide any additional context..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-report-details"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Your email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="For follow-up if needed"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      data-testid="input-reporter-email"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setReportDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleSubmitReport}
                      disabled={!reportReason || isSubmittingReport}
                      data-testid="button-submit-report"
                    >
                      {isSubmittingReport ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Submit Report
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                  {hasPrayed ? "You prayed!" : "I prayed for this"}
                </Button>
              </div>

              {hasPrayed && (
                <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-bold mb-3">Help this prayer reach more people</h4>
                  <Button variant="outline" className="w-full mb-2">Share on WhatsApp</Button>
                  <Button variant="outline" className="w-full">Copy Link</Button>
                </div>
              )}
              
              <div className="pt-4 border-t text-center">
                <Link href="/personal-prayer">
                  <span className="text-sm text-muted-foreground hover:text-primary underline cursor-pointer">
                    Is this a Personal Prayer?
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
