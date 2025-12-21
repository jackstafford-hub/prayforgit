import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { PrayerCard } from "@/components/prayer-card";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import type { Prayer } from "@shared/schema";

export default function MyPrayers() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: prayers, isLoading } = useQuery<Prayer[]>({
    queryKey: ["/api/my-prayers"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-3xl font-bold mb-4">My Prayers</h1>
          <p className="text-muted-foreground mb-8">Please log in to see your prayers.</p>
          <Link href="/auth">
            <Button data-testid="button-login-prompt">Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-3xl font-bold">My Prayers</h1>
          </div>
          <Link href="/create">
            <Button className="gap-2" data-testid="button-create-prayer">
              <Plus className="w-4 h-4" />
              New Prayer
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : prayers && prayers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {prayers.map((prayer) => (
              <PrayerCard key={prayer.id} prayer={prayer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
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
    </div>
  );
}
