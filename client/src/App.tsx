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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-to-pray" component={HowToPray} />
      <Route path="/browse" component={Browse} />
      <Route path="/create" component={CreatePrayer} />
      <Route path="/prayer/:id" component={PrayerDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
