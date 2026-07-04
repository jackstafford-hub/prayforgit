import type { Prayer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { UserCircle, Newspaper } from "lucide-react";
import bgTexture from "@assets/generated_images/subtle_warm_paper_texture_background.png";

interface PrayerCardProps {
  prayer: Prayer;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PrayerCard({ prayer }: PrayerCardProps) {
  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);
  const isCrisis = prayer.isDailyCrisisPrayer;

  return (
    <Link href={`/prayer/${prayer.slug || prayer.id}`}>
      <Card className="group h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300 border-border cursor-pointer bg-white">
        {/* Image */}
        <div className="h-48 w-full bg-muted relative overflow-hidden">
          <img
            src={prayer.imageUrl || bgTexture}
            alt={prayer.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300" />
          {isCrisis && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <Newspaper className="w-3 h-3" />
              <span>Crisis Prayer</span>
            </div>
          )}
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
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-2 uppercase tracking-wide">
                <UserCircle className="w-4 h-4" />
                <span>{prayer.author}</span>
              </div>
              {prayer.createdAt && (
                <span className={isCrisis ? "text-primary font-semibold" : ""}>
                  {formatDate(prayer.createdAt)}
                </span>
              )}
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
