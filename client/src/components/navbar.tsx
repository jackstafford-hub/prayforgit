import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Menu, UserCircle, LogOut, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = authUser as User | null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
          <Link href="/browse">
            <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-search">
              <Search className="w-5 h-5" />
            </Button>
          </Link>
          
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
            <Link href="/auth">
              <Button 
                variant="ghost" 
                className="hidden md:flex gap-2 text-sm font-medium cursor-pointer"
                data-testid="button-login"
              >
                Log in
              </Button>
            </Link>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden cursor-pointer touch-manipulation" 
            onClick={() => setMobileMenuOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="font-serif text-xl">
                  <span className="text-primary">Pray</span>ForChange.org
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                <Button 
                  variant="ghost" 
                  className="justify-start text-base cursor-pointer"
                  onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
                  data-testid="link-mobile-home"
                >
                  Home
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start text-base cursor-pointer"
                  onClick={() => { navigate("/how-to-pray"); setMobileMenuOpen(false); }}
                  data-testid="link-mobile-how-to-pray"
                >
                  How to pray
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start text-base cursor-pointer"
                  onClick={() => { navigate("/browse"); setMobileMenuOpen(false); }}
                  data-testid="link-mobile-browse"
                >
                  Browse
                </Button>
                <Button 
                  variant="default" 
                  className="justify-center text-base cursor-pointer mt-4"
                  onClick={() => { navigate("/create"); setMobileMenuOpen(false); }}
                  data-testid="link-mobile-create"
                >
                  Start a prayer
                </Button>
                
                <div className="border-t pt-4 mt-4">
                  {isAuthenticated && user ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 px-4 py-2">
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircle className="w-10 h-10 text-muted-foreground" />
                        )}
                        <span className="font-medium">{user.firstName || user.email || 'User'}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="justify-start text-base text-destructive cursor-pointer"
                        onClick={handleLogout}
                        data-testid="button-mobile-logout"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full justify-center text-base cursor-pointer"
                      onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                      data-testid="button-mobile-login"
                    >
                      Log in
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
