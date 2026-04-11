import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, TrendingUp, Users, Eye, Share2, ChevronRight, Target, Pencil } from "lucide-react";
import type { Prayer } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const GOAL_PRESETS = [500, 1000, 5000, 10000];

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [goalDialogPrayer, setGoalDialogPrayer] = useState<Prayer | null>(null);
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const { data: prayers, isLoading } = useQuery<Prayer[]>({
    queryKey: ["/api/my-prayers"],
    enabled: isAuthenticated,
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, goal }: { id: string; goal: number }) =>
      apiRequest("PATCH", `/api/prayers/${id}/goal`, { goal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-prayers"] });
      toast({ title: "Goal updated successfully" });
      closeGoalDialog();
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to update goal", variant: "destructive" });
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRequest("PATCH", `/api/prayers/${id}/content`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-prayers"] });
    },
    onError: () => {
      toast({ title: "Failed to update title", variant: "destructive" });
    },
  });

  const saveTitle = (id: string) => {
    const trimmed = editingTitleValue.trim();
    if (trimmed && trimmed.length <= 200) {
      updateTitleMutation.mutate({ id, title: trimmed });
      toast({ title: "Title updated" });
    }
    setEditingTitleId(null);
  };

  const openGoalDialog = (prayer: Prayer, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoalDialogPrayer(prayer);
    setSelectedGoal(null);
    setCustomGoalInput("");
    setUseCustom(false);
  };

  const closeGoalDialog = () => {
    setGoalDialogPrayer(null);
    setSelectedGoal(null);
    setCustomGoalInput("");
    setUseCustom(false);
  };

  const handleConfirmGoal = () => {
    if (!goalDialogPrayer) return;
    const newGoal = useCustom ? parseInt(customGoalInput) : selectedGoal;
    if (!newGoal || isNaN(newGoal) || newGoal <= goalDialogPrayer.goal) {
      toast({ title: `Goal must be greater than ${goalDialogPrayer.goal.toLocaleString()}`, variant: "destructive" });
      return;
    }
    updateGoalMutation.mutate({ id: goalDialogPrayer.id, goal: newGoal });
  };

  const totalPrayers = prayers?.reduce((sum, p) => sum + p.count, 0) || 0;
  const totalGoal = prayers?.reduce((sum, p) => sum + p.goal, 0) || 0;
  const publicPrayers = prayers?.filter(p => p.count >= 5).length || 0;

  if (authLoading) {
    return (
      <div className="bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">Prayer Dashboard</h1>
          <p className="text-muted-foreground mb-8">Please log in to see your dashboard.</p>
          <Link href="/auth">
            <Button data-testid="button-login-prompt">Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Your Prayer Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track how your prayers are growing</p>
          </div>
          <Link href="/create">
            <Button className="gap-2" data-testid="button-create-prayer">
              <Plus className="w-4 h-4" />
              New Prayer
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Prayers Received</span>
            </div>
            <p className="text-3xl font-bold" data-testid="text-total-prayers">{totalPrayers.toLocaleString()}</p>
          </div>
          
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Public Prayers</span>
            </div>
            <p className="text-3xl font-bold" data-testid="text-public-prayers">{publicPrayers}</p>
            <p className="text-xs text-muted-foreground mt-1">Visible on PrayForChange</p>
          </div>
          
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Goal Progress</span>
            </div>
            <p className="text-3xl font-bold" data-testid="text-goal-progress">
              {totalGoal > 0 ? Math.round((totalPrayers / totalGoal) * 100) : 0}%
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-serif text-xl font-bold mb-4">Your Prayers</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : prayers && prayers.length > 0 ? (
          <div className="space-y-4">
            {prayers.map((prayer) => {
              const progressPercent = Math.min((prayer.count / prayer.goal) * 100, 100);
              const isPublic = prayer.count >= 5;
              
              return (
                <div 
                  key={prayer.id} 
                  className="bg-card border rounded-xl p-4 md:p-6 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/prayer/${prayer.id}`)}
                  data-testid={`card-prayer-${prayer.id}`}
                >
                  <div className="flex gap-4">
                    {prayer.imageUrl && (
                      <div className="hidden md:block w-24 h-20 rounded-lg overflow-hidden shrink-0 bg-muted">
                        <img 
                          src={prayer.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        {editingTitleId === prayer.id ? (
                          <Input
                            autoFocus
                            value={editingTitleValue}
                            onChange={e => setEditingTitleValue(e.target.value)}
                            onBlur={() => saveTitle(prayer.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); saveTitle(prayer.id); }
                              if (e.key === 'Escape') setEditingTitleId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            className="font-serif font-bold text-lg h-8 py-0 flex-1"
                            maxLength={200}
                            data-testid={`input-title-${prayer.id}`}
                          />
                        ) : (
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <h3 className="font-serif font-bold text-lg line-clamp-1">{prayer.title}</h3>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingTitleId(prayer.id);
                                setEditingTitleValue(prayer.title);
                              }}
                              className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                              data-testid={`button-edit-title-${prayer.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                          {isPublic ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Public</span>
                          ) : (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              {5 - prayer.count} more to go public
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {prayer.aiSummary || prayer.description}
                      </p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{prayer.count.toLocaleString()} prayers</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{prayer.goal.toLocaleString()} goal</span>
                              <button
                                onClick={(e) => openGoalDialog(prayer, e)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                data-testid={`button-increase-goal-${prayer.id}`}
                              >
                                <Target className="w-3 h-3" />
                                Increase
                              </button>
                            </div>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/prayer/${prayer.id}`);
                          }}
                          data-testid={`button-share-${prayer.id}`}
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden md:inline">Share</span>
                        </Button>
                        
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-xl border">
            <p className="text-muted-foreground mb-6">You haven't created any prayers yet.</p>
            <Link href="/create">
              <Button className="gap-2" data-testid="button-create-first-prayer">
                <Plus className="w-4 h-4" />
                Start Your First Prayer
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Dialog open={!!goalDialogPrayer} onOpenChange={(open) => !open && closeGoalDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Increase Prayer Goal</DialogTitle>
            <DialogDescription>
              Current goal: <strong>{goalDialogPrayer?.goal.toLocaleString()}</strong>. Choose a new, higher goal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              {GOAL_PRESETS.filter(g => g > (goalDialogPrayer?.goal ?? 0)).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setSelectedGoal(g); setUseCustom(false); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                    !useCustom && selectedGoal === g
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                  data-testid={`button-goal-preset-${g}`}
                >
                  {g.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setUseCustom(true); setSelectedGoal(null); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
                  useCustom
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                data-testid="button-goal-custom"
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <Input
                type="number"
                min={(goalDialogPrayer?.goal ?? 0) + 1}
                placeholder={`More than ${goalDialogPrayer?.goal.toLocaleString()}`}
                value={customGoalInput}
                onChange={e => setCustomGoalInput(e.target.value)}
                className="w-40"
                autoFocus
                data-testid="input-goal-custom"
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeGoalDialog} disabled={updateGoalMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGoal}
              disabled={updateGoalMutation.isPending || (!selectedGoal && !customGoalInput)}
              className="gap-2"
              data-testid="button-confirm-goal"
            >
              {updateGoalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Set Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
