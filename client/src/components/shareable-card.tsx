import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Prayer } from "@shared/schema";

interface ShareableCardProps {
  prayer: Prayer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export function ShareableCardDialog({ prayer, open, onOpenChange }: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canShare] = useState(() => typeof navigator.share === "function");

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }, []);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prayer-card-${prayer.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) return;
      const file = new File([blob], `prayer-card.png`, { type: "image/png" });
      await navigator.share({
        title: prayer.title,
        text: `Join me in prayer: ${prayer.title}`,
        files: [file],
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const percentage = Math.min((prayer.count / prayer.goal) * 100, 100);
  const excerpt = truncateText(
    prayer.aiSummary || prayer.description || "",
    200
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Prayer Card</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="w-full max-w-[400px] mx-auto overflow-x-auto">
            <div
              ref={cardRef}
              style={{
                width: "400px",
                minWidth: "400px",
                padding: "40px 32px",
                background: "linear-gradient(145deg, #fdf6f0 0%, #fff8f2 40%, #fef3ea 100%)",
                borderRadius: "16px",
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "120px",
                  height: "120px",
                  background: "radial-gradient(circle at top right, rgba(236, 44, 34, 0.08) 0%, transparent 70%)",
                  borderRadius: "0 16px 0 0",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "160px",
                  height: "160px",
                  background: "radial-gradient(circle at bottom left, rgba(236, 44, 34, 0.05) 0%, transparent 70%)",
                  borderRadius: "0 0 0 16px",
                }}
              />

              {prayer.topic && (
                <div
                  style={{
                    display: "inline-block",
                    background: "rgba(236, 44, 34, 0.1)",
                    color: "#c41e16",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    marginBottom: "16px",
                  }}
                >
                  {prayer.topic}
                </div>
              )}

              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  lineHeight: 1.3,
                  marginBottom: "14px",
                  marginTop: 0,
                }}
              >
                {truncateText(prayer.title, 80)}
              </h2>

              <p
                style={{
                  fontSize: "13px",
                  color: "#555",
                  lineHeight: 1.65,
                  marginBottom: "20px",
                  marginTop: 0,
                }}
              >
                {excerpt}
              </p>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "20px",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: "#1a1a1a",
                    }}
                  >
                    {prayer.count.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    of {prayer.goal.toLocaleString()} prayers
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    background: "#f0e8e0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #ec2c22, #e85d56)",
                      borderRadius: "3px",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: "10px 0 0",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "#999",
                    letterSpacing: "0.3px",
                    marginBottom: "2px",
                  }}
                >
                  Join us in prayer at
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ec2c22",
                    letterSpacing: "0.3px",
                  }}
                >
                  PrayForChange.org
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-[400px]">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex-1"
              data-testid="button-download-card"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download
            </Button>
            {canShare && (
              <Button
                onClick={handleShare}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
                data-testid="button-share-card"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Share
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
