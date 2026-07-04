import { Mail, BookOpen } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/30 py-4 mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <Link
          href="/how-to-pray"
          className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          data-testid="link-how-to-pray-footer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          How to Pray
        </Link>
        <span className="hidden sm:inline text-muted-foreground/40">·</span>
        <span>Need help?</span>
        <a
          href="mailto:support@prayforchange.org"
          className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          data-testid="link-contact-support"
        >
          <Mail className="w-3.5 h-3.5" />
          support@prayforchange.org
        </a>
      </div>
    </footer>
  );
}
