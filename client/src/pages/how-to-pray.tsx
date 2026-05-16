import { useEffect } from "react";
import { Navbar } from "@/components/navbar";

const HOW_TO_PRAY_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Pray",
  "description": "A practical, step-by-step guide to prayer — covering posture, visualisation, directing healing energy, praying with sincerity, and developing control over prayer energy.",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Find a calm, centred posture",
      "text": "Sit or stand with the spine comfortably upright. Close your eyes and breathe slowly and evenly. Raise your hands to roughly shoulder height with palms turned outward and fingers together. Allow your shoulders to relax and your breath to settle."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Visualise luminous white light",
      "text": "Imagine a luminous white light descending from above, filling the mind and flowing down through the chest into the heart centre. Allow this light to continue down the arms and radiate outward through the palms."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Speak the prayer and direct the energy",
      "text": "Speak the prayer aloud, directing this energy toward whoever or whatever needs it — not picturing the situation as it is, but as it could be, filled with healing and wellbeing."
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Pray with full sincerity and feeling",
      "text": "Let your words and feelings be as expressive and heartfelt as possible — not shouted, but fully inhabited. Holding back undermines the energy; letting it flow authentically amplifies it."
    },
    {
      "@type": "HowToStep",
      "position": 5,
      "name": "Balance opposing qualities",
      "text": "Practise being gentle yet firm, passionate yet composed, deeply compassionate yet detached from the outcome, imploring yet confident. Alternating between quieter and slightly more emphatic moments within the same prayer helps develop this balance."
    },
    {
      "@type": "HowToStep",
      "position": 6,
      "name": "Close with gratitude",
      "text": "Gently brush the right hand over the left, away from you, as a natural seal of completion. Acknowledge and give thanks to whatever you call the Divine Source — not because thanks are required, but because gratitude affirms confidence in the prayer and brings the practice to a clear, peaceful close."
    }
  ]
};

export default function HowToPray() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(HOW_TO_PRAY_SCHEMA, null, 2);
    script.id = "how-to-pray-schema";
    if (!document.getElementById("how-to-pray-schema")) {
      document.head.appendChild(script);
    }
    return () => {
      const existing = document.getElementById("how-to-pray-schema");
      if (existing) existing.remove();
    };
  }, []);

  return (
    <div className="bg-background font-sans">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">
          The Power of Prayer
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-serif italic mb-10">
          Turning Intention into Real-World Impact
        </p>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p>
            Have you ever sensed that life is more than what meets the eye? That beyond matter and movement there is a subtle presence — an intelligent, living current flowing through everything?
          </p>
          <p>
            Across cultures and centuries, mystics, sages and seekers have spoken of this current not as a belief but as something directly experienced. They learned how to align with it. More than that — they learned how to direct it for healing, upliftment and positive change.
          </p>
          <p>
            Prayer, when properly understood, is one of the ways we consciously work with this universal force.
          </p>
          <p>
            If you feel called to help others, to bring light where there is confusion, or strength where there is suffering, prayer can become a practical tool — not just a comforting ritual.
          </p>
        </div>

        <blockquote className="my-12 pl-6 border-l-4 border-primary/30 italic text-xl md:text-2xl font-serif text-muted-foreground">
          "Prayer is not an old woman's idle amusement. Properly understood and applied, it is the most potent instrument of action."
          <footer className="mt-4 text-sm font-sans font-semibold not-italic text-foreground">
            – Mahatma Gandhi
          </footer>
        </blockquote>

        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">What Is Prayer, Really?</h2>

            <h3 className="text-2xl font-serif font-semibold">A Living Connection</h3>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Many traditions use different names for the ultimate creative intelligence — God, Brahman, the Divine, Great Spirit, Source. The label is secondary. What matters is the reality it points toward: the boundless origin of all life.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              This presence is not distant or abstract. It is the essence within every being. The same sacred spark that animates the cosmos lives quietly within you.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              True prayer is not about asking an external power for favours. It is about consciously connecting with that universal essence and allowing its energy to move through you.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Prayer as Energy in Motion</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              At its core, prayer is an energetic act.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              It is the deliberate transmission of refined life force from the one who prays to the one or situation receiving that prayer. This process follows natural laws — subtle perhaps, but no less real than gravity or electricity.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Across spiritual traditions this life force has been called:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-lg text-muted-foreground">
              <li>Prana in yogic philosophy</li>
              <li>Qi (Chi) in Chinese traditions</li>
              <li>The Universal Life Force in Western esoteric thought</li>
            </ul>
            <p className="text-lg leading-relaxed text-muted-foreground">
              This energy can be directed by focused thought and amplified by sincere feeling.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              When guided by compassion, goodwill and a desire for the highest good, this life force becomes spiritual energy — constructive, healing and transformative.
            </p>
            <p className="text-lg leading-relaxed font-semibold text-foreground">
              The quality of your prayer depends on the quality of your intention.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Feeling the Energy</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              With practice, many people report sensing this energy physically while praying.
            </p>
            <div className="bg-muted/30 p-8 rounded-xl my-4">
              <h4 className="font-serif font-bold text-xl mb-4">Common experiences include:</h4>
              <ul className="list-disc pl-6 space-y-2 text-lg text-muted-foreground">
                <li>Tingling in the hands</li>
                <li>Warmth or coolness in the palms</li>
                <li>A gentle pressure in the chest</li>
                <li>A sense of expanded awareness</li>
              </ul>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              These sensations are not the goal — they are simply indicators that something subtle yet real is happening.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Prayer becomes experiential rather than theoretical.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">How to Strengthen Your Prayer Practice</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              If you want your prayers to carry greater impact, there are three key principles to apply:
            </p>

            <div className="space-y-8 mt-6">
              <div>
                <h4 className="text-xl font-serif font-bold mb-2">1. Pray with Depth and Sincerity</h4>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Energy follows emotion. The more authentic and heartfelt your intention, the stronger the energetic current you generate.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Rather than repeating words mechanically, allow yourself to truly feel your desire for healing, peace or upliftment. Let compassion move you.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-serif font-bold mb-2">2. Use Focused Visualisation</h4>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  The mind shapes energy. Visualise the person or situation already improved, healed or harmonised.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  See them surrounded by radiant white light. Imagine strength replacing weakness, clarity replacing confusion, peace replacing conflict.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Visualisation gives direction to the energy you are sending.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-serif font-bold mb-2">3. Create an Open Channel</h4>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Posture influences flow. Instead of clasping your hands tightly against your body, try raising them slightly at shoulder height with palms facing outward. This gesture symbolises openness and outward transmission.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Relax your shoulders. Breathe steadily. Allow the energy to move freely.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  You are not forcing anything — you are cooperating with a greater current.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">What Happens When You Pray?</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Every sincere prayer contributes to the collective field of human consciousness.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-secondary/20 p-6 rounded-lg">
                <h4 className="font-serif font-bold text-lg mb-3">When directed toward individuals, it can:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Strengthen resilience</li>
                  <li>Inspire clarity</li>
                  <li>Encourage healing</li>
                  <li>Support inner guidance</li>
                </ul>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg">
                <h4 className="font-serif font-bold text-lg mb-3">When directed toward global situations, it can:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Support peaceful dialogue</li>
                  <li>Encourage wise decision-making</li>
                  <li>Inspire compassion in leaders</li>
                  <li>Empower humanitarian efforts</li>
                </ul>
              </div>
            </div>

            <p className="text-lg leading-relaxed text-muted-foreground">
              One prayer alone may not transform the world overnight. But sustained, collective intention has measurable influence. History has repeatedly shown that shifts in consciousness precede shifts in society.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Prayer in Challenging Times</h2>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-secondary/20 p-6 rounded-lg">
                <h4 className="font-serif font-bold text-lg mb-2">During Conflict</h4>
                <p className="text-muted-foreground">Focused prayer for harmony can help soften hostility, inspire reconciliation and support those working toward peace.</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg">
                <h4 className="font-serif font-bold text-lg mb-2">During Natural Disasters</h4>
                <p className="text-muted-foreground">Prayer can strengthen those affected, energise rescue efforts and inspire timely, compassionate action from individuals and organisations.</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">A Practical Spiritual Tool</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Prayer is not passive. It is participation.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              It is the conscious choice to align with the highest within yourself and to radiate that alignment outward.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              In a world that often feels fragmented or chaotic, prayer is a way of becoming a steady point of light — not by escaping reality, but by helping to elevate it.
            </p>
            <p className="text-lg leading-relaxed font-semibold text-foreground">
              And that is something anyone can begin today.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">A Step-by-Step Prayer Technique</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              The following technique draws on principles common to many contemplative and healing traditions. It is not tied to any single religion — it is a practical method for anyone who wishes to pray with greater intention and effect.
            </p>

            <div className="space-y-8 mt-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm">1</div>
                <div>
                  <h4 className="text-xl font-serif font-bold mb-2">Find a calm, centred posture</h4>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Begin by sitting or standing with the spine comfortably upright. Close your eyes and breathe slowly and evenly, allowing the mind to settle. There is no need to force stillness — simply let the breath guide you inward.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm">2</div>
                <div>
                  <h4 className="text-xl font-serif font-bold mb-2">Open the hands as a channel</h4>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Raise the hands to roughly shoulder height, palms turned outward, fingers together. This gesture — rather than clasping the hands — signals openness: you are not holding energy in, but allowing it to flow outward freely. Relax the shoulders and keep the body physically at ease throughout.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm">3</div>
                <div>
                  <h4 className="text-xl font-serif font-bold mb-2">Visualise the light filling you</h4>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    With eyes closed, visualise a luminous white light descending from above, filling the mind and flowing down through the chest into the heart centre. Allow this light to continue down the arms and radiate outward through the palms. You are becoming a vessel through which something greater can move.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm">4</div>
                <div>
                  <h4 className="text-xl font-serif font-bold mb-2">Speak the prayer and direct the energy</h4>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    Speak the prayer aloud, directing this energy toward whoever or whatever needs it. As you do, hold in your mind's eye not the situation as it is, but as it could be — filled with healing, peace and wellbeing. You are not describing a problem; you are affirming a possibility.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-serif font-bold text-primary text-sm">5</div>
                <div>
                  <h4 className="text-xl font-serif font-bold mb-2">Close with a natural seal of completion</h4>
                  <p className="text-lg leading-relaxed text-muted-foreground">
                    When the prayer feels complete, gently brush the right hand over the left, away from you. This simple gesture marks the end of the transmission. Then acknowledge and give thanks to whatever you call the Divine Source — not because thanks are required, but because gratitude affirms your confidence in the prayer and brings the practice to a clear, peaceful close.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Praying with Feeling</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Prayer works best when spoken or felt with genuine sincerity and full concentration. It is not small talk or a routine request — it is a direct appeal to something far greater than ordinary life.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              The words and feelings should be as expressive and heartfelt as possible. Not shouted — but fully inhabited. There is a difference between performing prayer and meaning it. The former moves air; the latter moves energy.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Holding back undermines the current. When we pray half-heartedly — distracted, self-conscious, going through the motions — we generate very little. When we let feeling flow authentically, the energetic transmission is amplified significantly.
            </p>
            <div className="bg-muted/30 p-8 rounded-xl my-4">
              <p className="text-lg leading-relaxed text-muted-foreground italic">
                Everyone has a unique way of praying, and that individuality is a strength, not a flaw. Prayer draws out our truest character — our deepest compassion, our most sincere concern, our genuine love for others. Do not try to imitate how you imagine prayer should sound. Pray as you truly feel.
              </p>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              If you find concentration difficult at first, begin with a brief moment of stillness before speaking. Even thirty seconds of quiet breathing can make a meaningful difference to the quality of what follows.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-primary">Developing Control Over Prayer Energy</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Once you feel comfortable praying with full feeling, the next stage is learning to hold opposing qualities simultaneously — and this is where the practice deepens considerably.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              The most effective prayer is characterised by a dynamic tension of qualities: gentle yet firm, passionate yet composed, deeply compassionate yet detached from the outcome, imploring yet confident. These are not contradictions — they are the hallmarks of mature spiritual action.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              One practical way to develop this balance is to consciously alternate between quieter and slightly more emphatic moments within the same prayer. Allow a phrase to build with feeling, then let it soften before building again. This rhythm — like breathing — prevents the energy from becoming forced or flat.
            </p>

            <div className="bg-secondary/20 p-8 rounded-xl my-4 space-y-4">
              <h4 className="font-serif font-bold text-xl">What mature prayer feels like:</h4>
              <ul className="list-disc pl-6 space-y-3 text-lg text-muted-foreground">
                <li>The body remains physically relaxed — there is no tension, no straining</li>
                <li>The mind is focused but not rigid — open to inspiration mid-prayer</li>
                <li>The heart is genuinely moved — but not swept away by emotion</li>
                <li>There is a quality of surrender — trusting the outcome to the Divine</li>
              </ul>
            </div>

            <p className="text-lg leading-relaxed text-muted-foreground">
              Prayer is not an act of forcing — it is an act of becoming a clear, open channel. The more you practise, the less effort it requires, and the more naturally the energy moves.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Over time, this practice becomes something larger than technique. It becomes a path of personal growth, quietly developing sincerity, compassion and inner strength in every area of life. People who pray regularly often find that the qualities they bring to prayer begin to show up in how they listen, how they respond under pressure, and how they treat others.
            </p>
            <p className="text-lg leading-relaxed font-semibold text-foreground">
              The practice of prayer, when taken seriously, does not just change what we send outward. It changes who we are.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
