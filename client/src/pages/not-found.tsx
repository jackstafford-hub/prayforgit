import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-serif font-semibold mb-3">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Sorry, we couldn't find the page you were looking for. Let's get you back on track.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button className="gap-2" data-testid="button-go-home">
            <Home className="w-4 h-4" />
            Go to homepage
          </Button>
        </Link>
        <Link href="/create">
          <Button variant="outline" data-testid="button-start-prayer">
            Start a prayer
          </Button>
        </Link>
      </div>
    </div>
  );
}
