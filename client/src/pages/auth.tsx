import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-8 gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </Link>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold">
              <span className="text-primary">Pray</span>ForChange.org
            </h1>
            <p className="text-muted-foreground mt-2">
              Join our prayer community
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Welcome</CardTitle>
              <CardDescription className="text-center">
                Sign in to share your prayer requests and join our community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>Sign in with your Google, Apple, or email account</p>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full gap-2" 
                size="lg"
                data-testid="button-login"
              >
                <LogIn className="w-5 h-5" />
                Sign In / Create Account
              </Button>

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Secure login powered by Replit Auth
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports Google, Apple, GitHub, and email/password
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6">
                By continuing, you agree to our terms of service and privacy policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
