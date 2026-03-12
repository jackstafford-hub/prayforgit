import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, UserCircle, Flag, Pencil, RefreshCw, Check, X, Loader2, MessageSquarePlus, Clock, Image, Link2, Share2, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";
import { getPrayerById, updatePrayerContent, regeneratePrayerContent } from "@/lib/api";
import type { Prayer, PrayerUpdate, User } from "@shared/schema";
import { ShareableCardDialog } from "@/components/shareable-card";
import { SiWhatsapp, SiFacebook, SiX } from "react-icons/si";
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
  const [location, navigate] = useLocation();
  const id = params?.id || "";
  const donated = new URLSearchParams(location.split('?')[1] || '').get('donated') === 'true';
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

  const [updates, setUpdates] = useState<PrayerUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  
  const { data: adminCheck } = useQuery<{ isAdmin: boolean } | null>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
  });
  const isAdmin = !!adminCheck?.isAdmin;
  const isAuthor = isAuthenticated && prayer && prayer.authorId === user?.id;
  const canEdit = isAuthor || isAdmin;

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
      fetchUpdates();
    }
  }, [id]);

  const fetchUpdates = async () => {
    try {
      const response = await fetch(`/api/prayers/${id}/updates`);
      if (response.ok) {
        setUpdates(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!newUpdateContent.trim() || !prayer) return;
    setIsPostingUpdate(true);
    try {
      const response = await fetch(`/api/prayers/${prayer.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newUpdateContent.trim() }),
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post update");
      }
      const update = await response.json();
      setUpdates(prev => [update, ...prev]);
      setNewUpdateContent("");
      toast({ title: "Update posted", description: "Your update has been shared with the community." });
    } catch (error: any) {
      toast({ title: "Failed to post update", description: error.message, variant: "destructive" });
    } finally {
      setIsPostingUpdate(false);
    }
  };

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
      if (isAuthenticated) {
        navigate(`/support/${id}`);
      } else {
        navigate(`/auth?redirect=/support/${id}`);
      }
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
            
            {/* Updates Section */}
            <div className="pt-8 border-t space-y-6">
              <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-primary" />
                Updates
                {updates.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">({updates.length})</span>
                )}
              </h2>

              {isAuthor && (
                <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                  <Textarea
                    placeholder="Share an update with your prayer community..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="min-h-[80px] bg-background"
                    data-testid="textarea-prayer-update"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePostUpdate}
                      disabled={isPostingUpdate || !newUpdateContent.trim()}
                      data-testid="button-post-update"
                    >
                      {isPostingUpdate ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post Update"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {updatesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No updates yet.</p>
              ) : (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-4 bg-background space-y-2" data-testid={`update-${update.id}`}>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{update.content}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Share</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const url = `https://wa.me/?text=${encodeURIComponent(`Pray for ${prayer.title} on PrayForChange.org\n\n${window.location.href}`)}`;
                      window.open(url, "_blank");
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                    data-testid="button-share-whatsapp"
                  >
                    <SiWhatsapp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(`Pray for ${prayer.title} on PrayForChange.org`)}`;
                      window.open(url, "_blank", "width=600,height=400");
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#1877F2] hover:bg-[#1877F2]/10 transition-colors"
                    title="Share on Facebook"
                    aria-label="Share on Facebook"
                    data-testid="button-share-facebook"
                  >
                    <SiFacebook className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const url = `https://x.com/intent/tweet?text=${encodeURIComponent(`Pray for ${prayer.title} on PrayForChange.org`)}&url=${encodeURIComponent(window.location.href)}`;
                      window.open(url, "_blank", "width=600,height=400");
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Share on X"
                    aria-label="Share on X"
                    data-testid="button-share-x"
                  >
                    <SiX className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`Pray for ${prayer.title} on PrayForChange.org`);
                      const body = encodeURIComponent(`I wanted to share this prayer request with you:\n\n${prayer.title}\n\n${window.location.href}`);
                      window.open(`mailto:?subject=${subject}&body=${body}`);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Share via email"
                    aria-label="Share via email"
                    data-testid="button-share-email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href).then(() => {
                        toast({ title: "Link copied", description: "Prayer link copied to clipboard." });
                      }).catch(() => {
                        toast({ title: "Could not copy", description: "Please copy the link from your browser's address bar.", variant: "destructive" });
                      });
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Copy link"
                    aria-label="Copy prayer link"
                    data-testid="button-copy-link"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShareCardOpen(true)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Download prayer card"
                    aria-label="Download prayer card"
                    data-testid="button-share-prayer-card"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {donated ? (
                <>
                  <div className="text-center space-y-4 py-4 border-t">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-foreground" data-testid="text-thank-you">
                      Thank You
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your generous donation helps sustain PrayForChange and spread this prayer to more people. God bless you.
                    </p>
                  </div>

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
                  </div>

                  <div className="pt-4 border-t">
                    <Link href="/browse">
                      <Button variant="outline" className="w-full" data-testid="button-browse-prayers">
                        Browse More Prayers
                      </Button>
                    </Link>
                  </div>

                  <div className="pt-4 border-t text-center">
                    <Link href="/personal-prayer">
                      <span className="text-sm text-muted-foreground hover:text-primary underline cursor-pointer">
                        Is this a Personal Prayer?
                      </span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 border-t pt-6">
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
                  
                  <div className="pt-4 border-t text-center">
                    <Link href="/personal-prayer">
                      <span className="text-sm text-muted-foreground hover:text-primary underline cursor-pointer">
                        Is this a Personal Prayer?
                      </span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {prayer && (
        <ShareableCardDialog
          prayer={prayer}
          open={shareCardOpen}
          onOpenChange={setShareCardOpen}
        />
      )}
    </div>
  );
}
