import { PrayerCard } from "@/components/prayer-card";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PRAYER_CATEGORIES } from "@shared/schema";
import type { Prayer } from "@shared/schema";
import { Search, X } from "lucide-react";

const CATEGORIES = ["All", ...PRAYER_CATEGORIES];

export default function Browse() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeCategory !== "All") params.set("topic", activeCategory);
    return params.toString();
  }, [debouncedSearch, activeCategory]);

  const { data: prayers = [], isLoading, isError, refetch } = useQuery<Prayer[]>({
    queryKey: ["/api/prayers", debouncedSearch, activeCategory],
    queryFn: () => fetch(`/api/prayers${queryParams ? `?${queryParams}` : ""}`).then(r => r.json()),
  });

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
  };

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  const isSearching = searchInput !== debouncedSearch;

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      {/* Header */}
      <div className="bg-muted/30 py-12 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Browse All Prayers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            Explore prayer requests from our community. Each prayer represents someone's hope for change. 
            Join them in faith and multiply the power of prayer.
          </p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search prayers by keyword or author..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9"
              data-testid="input-search-prayers"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prayers Grid */}
      <div className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          {isLoading || isSearching ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">Unable to load prayers. Please try again.</p>
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                data-testid="button-retry-browse"
              >
                Try again
              </Button>
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              {debouncedSearch ? (
                <>
                  <p className="text-xl text-muted-foreground">
                    No prayers found for "{debouncedSearch}"{activeCategory !== "All" ? ` in ${activeCategory}` : ""}.
                  </p>
                  <Button variant="outline" onClick={clearSearch} data-testid="button-clear-search-empty">
                    Clear search
                  </Button>
                </>
              ) : activeCategory !== "All" ? (
                <>
                  <p className="text-xl text-muted-foreground">No prayers in "{activeCategory}" yet.</p>
                  <Button variant="outline" onClick={() => setActiveCategory("All")} data-testid="button-show-all">
                    Show all prayers
                  </Button>
                </>
              ) : (
                <p className="text-xl text-muted-foreground">No prayers yet. Be the first to start one!</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-8" data-testid="text-results-count">
                {prayers.length} prayer {prayers.length === 1 ? 'request' : 'requests'}
                {debouncedSearch && ` for "${debouncedSearch}"`}
                {activeCategory !== "All" && ` in ${activeCategory}`}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prayers.map(prayer => (
                  <PrayerCard key={prayer.id} prayer={prayer} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
