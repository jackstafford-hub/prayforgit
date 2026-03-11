import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import CreatePrayer from "@/pages/create-prayer";
import PrayerDetail from "@/pages/prayer-detail";
import HowToPray from "@/pages/how-to-pray";
import Browse from "@/pages/browse";
import CompleteSupport from "@/pages/complete-support";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import PersonalPrayer from "@/pages/personal-prayer";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import AdminDashboard from "@/pages/admin";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-to-pray" component={HowToPray} />
      <Route path="/browse" component={Browse} />
      <Route path="/create" component={CreatePrayer} />
      <Route path="/prayer/:id" component={PrayerDetail} />
      <Route path="/support/:id" component={CompleteSupport} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/personal-prayer" component={PersonalPrayer} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
            <Router />
          </div>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
