import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Menu, UserCircle } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <a className="font-serif text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
              <span className="text-primary">Pray</span>ForChange.org
            </a>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/how-to-pray"><a className="hover:text-foreground transition-colors">How to pray</a></Link>
            <Link href="/browse"><a className="hover:text-foreground transition-colors">Browse</a></Link>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Search className="w-5 h-5" />
          </Button>
          
          <Link href="/create">
            <Button variant="outline" className="hidden md:flex rounded-full px-6 border-primary text-primary hover:bg-primary/5 hover:text-primary font-medium">
              Start a prayer
            </Button>
          </Link>
          
          <Button variant="ghost" className="hidden md:flex gap-2 text-sm font-medium">
            Log in
          </Button>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
