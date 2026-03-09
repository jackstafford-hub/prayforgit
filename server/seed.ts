import { db } from "./db";
import { prayers } from "@shared/schema";
import { eq } from "drizzle-orm";

const SEED_PRAYERS = [
  {
    title: 'Healing for my mother fighting cancer',
    description: 'My mother was diagnosed with stage 4 breast cancer six months ago. The diagnosis came as a complete shock to our family. She has always been the pillar of our home, the one who held us together through every storm. Now she is fighting the biggest battle of her life.',
    imageUrl: '/assets/older_woman_hands_holding_bible_in_hospital.png',
    aiSummary: `My mother was diagnosed with stage 4 breast cancer six months ago. The diagnosis came as a complete shock to our family. She has always been the pillar of our home, the one who held us together through every storm. Now she is fighting the biggest battle of her life.

The cancer has spread to her lymph nodes and the doctors have told us that the prognosis is uncertain. She has undergone three rounds of chemotherapy so far, and each treatment takes more out of her. We watch her lose her hair, her appetite, and sometimes her hope. But we refuse to give up.

We believe in a God who performs miracles. We believe that no diagnosis is beyond His reach. We are asking the prayer community to stand with us in faith, believing that her body can be restored, that the cancer cells can be destroyed, and that she can live to see her grandchildren grow up.

Please pray for complete healing, for strength during treatment, for peace for our family, and for the medical team to have wisdom in her care.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring restoration and wholeness to this precious mother,
And healing and protection to
Her body as she fights this battle against cancer.

Oh Divine Father of Life,
May Thy wondrous power flood her body now,
Bringing hope wherever it touches,
Healing to every cell and every organ,
And strength to her family who stand beside her through this trial.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring her healing,
To inspire the doctors, nurses, and caregivers in their work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed strength and courage flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Sarah Jenkins',
    count: 1243,
    goal: 1500,
    topic: 'Health',
  },
  {
    title: 'Restore my marriage and bring peace to our home',
    description: 'After 12 years of marriage, my wife and I are separated. What started as small disagreements grew into walls of resentment and silence. We have two beautiful children who deserve to grow up in a loving, unified home.',
    imageUrl: '/assets/sad_couple_sitting_apart_at_kitchen_table.png',
    aiSummary: `After 12 years of marriage, my wife and I are separated. What started as small disagreements grew into walls of resentment and silence. We have two beautiful children who deserve to grow up in a loving, unified home.

I take responsibility for my part in this. I worked too much. I didn't listen when she needed to talk. I let stress make me irritable and distant. By the time I realized what was happening, she had already built walls around her heart.

She moved out three months ago. The kids split their time between us, confused and hurting. Every time I see their little faces trying to understand why mommy and daddy don't live together anymore, my heart breaks into a thousand pieces.

I still love her. I believe she still loves me somewhere beneath the pain. I am in counseling, working on myself, trying to become the husband I should have been all along. But I cannot do this alone.

I am asking for prayers for reconciliation, for softened hearts, for forgiveness to flow between us. Pray that God would remove the pride and hurt that keeps us apart. Pray for our children to have peace during this storm.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring reconciliation and restoration to this marriage,
And healing and protection to
This family torn apart by pain and silence.

Oh Divine Father of Life,
May Thy wondrous power flood this home now,
Bringing hope wherever it touches,
Healing to hearts hardened by resentment,
And strength to the children who long for peace and unity.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring this family together again,
To inspire counselors and loved ones in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed forgiveness and tenderness flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Michael Brown',
    count: 567,
    goal: 1000,
    topic: 'Family',
  },
  {
    title: 'Prayer for a breakthrough in employment',
    description: 'I was laid off six months ago when my company downsized. At first, I thought I would find something quickly with my experience and skills. But rejection after rejection has worn down my confidence and my savings.',
    imageUrl: '/assets/stressed_man_looking_at_bills.png',
    aiSummary: `I was laid off six months ago when my company downsized. At first, I thought I would find something quickly with my experience and skills. But rejection after rejection has worn down my confidence and my savings.

I have a wife and three children depending on me. Every month when the bills come, I feel the weight of their needs on my shoulders. We have already cut back on everything we can. The kids don't complain about the changes, but I see them notice.

I have applied to over 200 jobs. I have had 15 interviews. Each time I thought, "This is the one," only to receive another polite rejection email. The worst part is not knowing why. Am I too experienced? Not experienced enough? Too old? The uncertainty is crushing.

But I have a final interview on Tuesday with a company I believe would be a perfect fit. The role aligns with my skills, the culture seems healthy, and the salary would allow us to recover from these difficult months.

I am asking for prayers for favor in this interview. Pray that God would go before me and prepare the hearts of the hiring managers. Pray for clarity of mind, confidence in my abilities, and peace regardless of the outcome.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring breakthrough and provision to this faithful worker,
And healing and protection to
His spirit worn down by months of searching and rejection.

Oh Divine Father of Life,
May Thy wondrous power flood his path now,
Bringing hope wherever it touches,
Opening doors that no man can shut,
And strength to his family who wait with patience and trust.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring this breakthrough about,
To inspire the hiring managers and decision-makers in their work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed opportunity and abundance flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'David Wilson',
    count: 89,
    goal: 100,
    topic: 'Employment',
  },
  {
    title: 'Peace for the conflict in the Middle East',
    description: 'The ongoing violence in the Middle East has claimed thousands of innocent lives. Families are torn apart, children are orphaned, and communities are devastated. We must pray for peace.',
    imageUrl: '/assets/candlelight_vigil_for_peace.png',
    aiSummary: `The ongoing violence in the Middle East has claimed thousands of innocent lives. Families are torn apart, children are orphaned, and communities are devastated. We must pray for peace.

This is not a political prayer request. It is a human one. On all sides of this conflict are mothers who weep for their children, fathers who cannot protect their families, and young people whose futures have been stolen by violence they did not choose.

We have seen images that break our hearts. Hospitals overwhelmed. Neighborhoods reduced to rubble. Eyes of children that have seen too much. These are real people, created in God's image, loved by Him beyond measure.

History tells us that this conflict is complex, with deep roots and genuine grievances on multiple sides. We do not pretend to have political solutions. But we know that the God of peace can do what diplomats and soldiers cannot.

We are calling on believers around the world to join in prayer for an end to the violence, protection for civilians, wisdom for leaders, and ultimately, a just and lasting peace that allows all people in the region to live in safety and dignity.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring peace and harmony to the Middle East,
And healing and protection to
All the people who are injured and suffering in this
War-torn region.

Oh Divine Father of Life,
May Thy wondrous power flood this land now,
Bringing hope wherever it touches,
Healing to the sick and wounded,
And strength to those who have suffered great loss.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring peace,
To inspire the leaders, diplomats, and peacemakers in their difficult work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed aid of every kind flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Grace Community',
    count: 2847,
    goal: 5000,
    topic: 'World Peace',
  }
];

export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    const existing = await db.select().from(prayers).limit(1);
    if (existing.length > 0) {
      console.log('Database already has data, updating seed prayers...');
      for (const seed of SEED_PRAYERS) {
        await db
          .update(prayers)
          .set({
            aiSummary: seed.aiSummary,
            recitablePrayer: seed.recitablePrayer,
            imageUrl: seed.imageUrl,
            description: seed.description,
            count: seed.count,
            goal: seed.goal,
          })
          .where(eq(prayers.title, seed.title));
      }
      console.log('Seed prayers updated successfully!');
      return;
    }

    await db.insert(prayers).values(SEED_PRAYERS);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
