import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, KeyRound, CheckCircle, AlertTriangle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <CardTitle>Invalid Reset Link</CardTitle>
                <CardDescription>
                  This password reset link is missing or invalid. Please request a new one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/forgot-password">
                  <Button className="w-full" data-testid="button-request-new-link">
                    Request New Reset Link
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <Link href="/auth">
          <Button variant="ghost" className="mb-8 gap-2" data-testid="button-back-to-login">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Button>
        </Link>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold">
              <span className="text-primary">Pray</span>ForChange.org
            </h1>
          </div>

          <Card>
            {success ? (
              <>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Password Reset</CardTitle>
                  <CardDescription>
                    Your password has been reset successfully. You can now sign in with your new password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/auth">
                    <Button className="w-full" data-testid="button-go-to-signin">
                      Sign In
                    </Button>
                  </Link>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-center">Set New Password</CardTitle>
                  <CardDescription className="text-center">
                    Choose a new password for your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md" data-testid="text-error">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        data-testid="input-new-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        data-testid="input-confirm-new-password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-reset-password"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
