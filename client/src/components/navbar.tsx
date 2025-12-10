import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Menu, UserCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = authUser as User | null;

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/">
            <span className="font-serif text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity cursor-pointer">
              <span className="text-primary">Pray</span>ForChange.org
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/how-to-pray"><span className="hover:text-foreground transition-colors cursor-pointer">How to pray</span></Link>
            <Link href="/browse"><span className="hover:text-foreground transition-colors cursor-pointer">Browse</span></Link>
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
          
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-sm font-medium" data-testid="button-user-menu">
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-6 h-6" />
                  )}
                  <span className="hidden md:inline">{user.firstName || user.email || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              className="hidden md:flex gap-2 text-sm font-medium"
              onClick={handleLogin}
              data-testid="button-login"
            >
              Log in
            </Button>
          )}
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
