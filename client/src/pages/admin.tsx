import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Shield, Flag, AlertTriangle, Check, Trash2, Eye, ExternalLink } from "lucide-react";
import type { Prayer, Report } from "@shared/schema";

type AdminStats = {
  totalPrayers: number;
  flaggedPrayers: number;
  totalReports: number;
};

type ReportWithPrayer = Report & { prayerTitle: string };

type Tab = "flagged" | "reports";

export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("flagged");

  const { data: adminCheck, isLoading: adminCheckLoading } = useQuery<{ isAdmin: boolean } | null>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!adminCheck?.isAdmin,
  });

  const { data: flaggedPrayers, isLoading: flaggedLoading } = useQuery<Prayer[]>({
    queryKey: ["/api/admin/flagged-prayers"],
    enabled: !!adminCheck?.isAdmin,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<ReportWithPrayer[]>({
    queryKey: ["/api/admin/reports"],
    enabled: !!adminCheck?.isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/prayers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-prayers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Prayer Approved", description: "The prayer is now visible to the public." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve prayer.", variant: "destructive" });
    },
  });

  const deletePrayerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/prayers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-prayers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Prayer Deleted", description: "The prayer has been permanently removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete prayer.", variant: "destructive" });
    },
  });

  const dismissReportMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Report Dismissed", description: "The report has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to dismiss report.", variant: "destructive" });
    },
  });

  if (authLoading || adminCheckLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !adminCheck?.isAdmin) {
    navigate("/");
    return null;
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage prayers and review reports</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total Prayers</span>
            </div>
            <p data-testid="text-total-prayers" className="text-3xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalPrayers || 0}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Flag className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Flagged for Review</span>
            </div>
            <p data-testid="text-flagged-count" className="text-3xl font-bold text-amber-600">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.flaggedPrayers || 0}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pending Reports</span>
            </div>
            <p data-testid="text-reports-count" className="text-3xl font-bold text-red-600">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalReports || 0}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          <button
            data-testid="tab-flagged"
            onClick={() => setActiveTab("flagged")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "flagged"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Flagged Prayers
            {stats?.flaggedPrayers ? (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {stats.flaggedPrayers}
              </Badge>
            ) : null}
          </button>
          <button
            data-testid="tab-reports"
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Reports
            {stats?.totalReports ? (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {stats.totalReports}
              </Badge>
            ) : null}
          </button>
        </div>

        {activeTab === "flagged" && (
          <div className="space-y-4">
            {flaggedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !flaggedPrayers?.length ? (
              <div className="text-center py-16 border rounded-xl bg-card">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">All clear</h3>
                <p className="text-muted-foreground">No prayers are currently flagged for review.</p>
              </div>
            ) : (
              flaggedPrayers.map((prayer) => (
                <div
                  key={prayer.id}
                  data-testid={`card-flagged-prayer-${prayer.id}`}
                  className="rounded-xl border bg-card p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {prayer.imageUrl && (
                      <img
                        src={prayer.imageUrl}
                        alt=""
                        className="w-full md:w-24 h-32 md:h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-serif text-lg font-semibold line-clamp-1">{prayer.title}</h3>
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400 flex-shrink-0">
                          Flagged
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        By {prayer.author} on {formatDate(prayer.createdAt)}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prayer.description || prayer.aiSummary || "No description provided."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      data-testid={`button-view-prayer-${prayer.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/prayer/${prayer.id}`, "_blank")}
                      className="gap-1 text-muted-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      data-testid={`button-approve-prayer-${prayer.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => approveMutation.mutate(prayer.id)}
                      disabled={approveMutation.isPending}
                      className="gap-1 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      data-testid={`button-delete-prayer-${prayer.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to permanently delete this prayer?")) {
                          deletePrayerMutation.mutate(prayer.id);
                        }
                      }}
                      disabled={deletePrayerMutation.isPending}
                      className="gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !reports?.length ? (
              <div className="text-center py-16 border rounded-xl bg-card">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">No reports</h3>
                <p className="text-muted-foreground">There are no pending reports to review.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  data-testid={`card-report-${report.id}`}
                  className="rounded-xl border bg-card p-5 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-serif text-lg font-semibold line-clamp-1">
                        {report.prayerTitle}
                      </h3>
                      <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-600 dark:text-red-400 flex-shrink-0 capitalize">
                        {report.reason}
                      </Badge>
                    </div>
                    {report.details && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {report.details}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Reported {formatDate(report.createdAt)}</span>
                      {report.reporterEmail && <span>By {report.reporterEmail}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button
                      data-testid={`button-view-reported-prayer-${report.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/prayer/${report.prayerId}`, "_blank")}
                      className="gap-1 text-muted-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Prayer
                    </Button>
                    <Button
                      data-testid={`button-dismiss-report-${report.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => dismissReportMutation.mutate(report.id)}
                      disabled={dismissReportMutation.isPending}
                      className="gap-1"
                    >
                      Dismiss
                    </Button>
                    <Button
                      data-testid={`button-delete-reported-prayer-${report.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to permanently delete this prayer and all its reports?")) {
                          deletePrayerMutation.mutate(report.prayerId);
                        }
                      }}
                      disabled={deletePrayerMutation.isPending}
                      className="gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Prayer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
