import { Prayer } from "@/lib/store";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { UserCircle } from "lucide-react";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";

interface PrayerCardProps {
  prayer: Prayer;
}

export function PrayerCard({ prayer }: PrayerCardProps) {
  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);

  return (
    <Link href={`/prayer/${prayer.id}`}>
      <Card className="group h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 border-border cursor-pointer bg-white">
        {/* Placeholder Image Area - In a real app this would be a user upload */}
        <div 
          className="h-48 w-full bg-muted relative overflow-hidden"
          style={{ 
            backgroundImage: `url(${bgTexture})`,
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          }}
        >
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300" />
        </div>

        <CardContent className="flex-1 p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-xl font-bold leading-tight group-hover:underline decoration-primary decoration-2 underline-offset-2 mb-2 line-clamp-3">
              {prayer.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {prayer.description}
            </p>
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
              <UserCircle className="w-4 h-4" />
              <span>{prayer.author}</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">
                  {prayer.count.toLocaleString()} <span className="font-normal text-muted-foreground">prayers</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {prayer.goal.toLocaleString()} goal
                </span>
              </div>
              <Progress value={percentage} className="h-2 bg-secondary" indicatorClassName="bg-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
