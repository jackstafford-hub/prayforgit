import { Navbar } from "@/components/navbar";

export default function HowToPray() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
          Prayer Energy – Make your prayers really work
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-serif italic mb-10">
          Discover the power of prayer to change the world
        </p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p>
            Have you always felt that there was more to life than the physical world we see around us? That there might be – must be – an all-pervasive, subtle energy that exists throughout the universe?
          </p>
          <p>
            To wise men and women throughout the ages, this energy isn’t something vague or imaginary; it is something we can physically feel.
          </p>
          <p>
            They made themselves a channel for this energy and sent it outwards for the spiritual healing and inspiration of others in need. They understood how they could invoke this energy through prayer. Not prayer in the sense of asking God for a favor, but in the yogic sense of radiating energy with true love.
          </p>
          <p>
            Master of Yoga Dr. George King (1919-1997) used his unique experience of prayer to teach thousands of people a simple, effective technique for attracting and radiating this subtle energy.
          </p>
          <p className="font-semibold text-xl font-serif text-primary">
            He called it “Dynamic Prayer.”
          </p>
          <p>
            If you want to help people, and change the world for the better, using a simple technique for radiating subtle energy that anybody can learn, this is it!
          </p>
        </div>

        <blockquote className="mt-12 pl-6 border-l-4 border-primary/30 italic text-xl md:text-2xl font-serif text-muted-foreground">
          “Prayer is not an old woman's idle amusement. Properly understood and applied, it is the most potent instrument of action.”
          <footer className="mt-4 text-sm font-sans font-semibold not-italic text-foreground">
            – Mahatma Gandhi
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
