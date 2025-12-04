import { useState } from "react";
import { useLocation } from "wouter";
import { prayerStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function CreatePrayer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate network delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));

    prayerStore.add({
      title: formData.title,
      description: formData.description
    });

    toast({
      title: "Prayer Published",
      description: "Your prayer request has been shared with the community.",
    });

    setIsSubmitting(false);
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-primary text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center">Share a Prayer Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">What are we praying for?</Label>
                <Input
                  id="title"
                  placeholder="e.g., Healing for my sister"
                  required
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-11 bg-muted/30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Details (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Share as much or as little as you feel comfortable with..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px] bg-muted/30 resize-none"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish Prayer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
