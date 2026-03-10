import { db } from "./db";
import { prayers } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

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
  },
  {
    title: 'Strength for our neighborhood after the flood',
    description: 'Last week a devastating flood swept through our neighborhood, destroying homes and displacing dozens of families. People lost everything they had worked for. We are coming together as a community to rebuild, but we need strength and resources.',
    imageUrl: '/assets/community_hands_gathering.png',
    aiSummary: `Last week a devastating flood swept through our neighborhood, destroying homes and displacing dozens of families. People lost everything they had worked for. We are coming together as a community to rebuild, but we need strength and resources.

The water came in the middle of the night. Families woke to rising water in their bedrooms, grabbing what they could and running to higher ground. By morning, streets had become rivers and living rooms had become lakes. The damage is staggering.

But in the midst of this devastation, something beautiful has happened. Neighbors who barely knew each other are now sharing meals, opening their homes, and organizing cleanup crews. Churches, mosques, and community centers have become shelters. Strangers are showing up with trucks full of supplies.

We are asking for prayers for continued unity in our community. Pray for the families who lost everything — their homes, their photographs, their sense of security. Pray for the volunteers who are exhausted but refuse to stop. Pray for the resources we need to rebuild not just houses, but lives.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring restoration and unity to this community,
And healing and protection to
All the families displaced by this devastating flood.

Oh Divine Father of Life,
May Thy wondrous power flood this neighborhood now,
Bringing hope wherever it touches,
Rebuilding what the waters have torn down,
And strength to every volunteer who gives of themselves.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring this community back together,
To inspire the relief workers, neighbors, and leaders in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed resources and compassion flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'River Valley Community Church',
    count: 412,
    goal: 1000,
    topic: 'Community',
  },
  {
    title: 'Deepening my faith in a season of doubt',
    description: 'I have been a believer for twenty years, but lately I find myself struggling with deep doubts. Questions I thought I had answered long ago have resurfaced, and I feel distant from God in a way that frightens me.',
    imageUrl: '/assets/candle_faith_in_darkness.png',
    aiSummary: `I have been a believer for twenty years, but lately I find myself struggling with deep doubts. Questions I thought I had answered long ago have resurfaced, and I feel distant from God in a way that frightens me.

It started after I lost my best friend in a car accident last year. She was the most faithful person I knew — always serving others, always trusting God, always the first to pray. Her death shook something loose inside me that I cannot seem to put back.

I still go to church. I still read my Bible. But the words feel hollow, and my prayers feel like they bounce off the ceiling. I wonder if anyone is listening. I wonder if everything I have built my life upon is real.

I know doubt is not the opposite of faith. I know that many great believers have walked through dark nights of the soul. But knowing that intellectually and experiencing it emotionally are two very different things.

I am asking for prayers that God would meet me in this darkness. That He would not be offended by my questions but would answer them with His presence. That my faith would emerge from this season stronger and deeper than before.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring renewed faith and assurance to this searching soul,
And healing and protection to
A heart wrestling with doubt and longing for certainty.

Oh Divine Father of Life,
May Thy wondrous power flood this spirit now,
Bringing hope wherever it touches,
Light to the darkness of unanswered questions,
And strength to hold on when the path is unclear.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are walking through seasons of doubt,
To remind them that questions are not the enemy of faith
But the doorway to deeper understanding.

Oh Divine Creator,
May much-needed peace and revelation flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Anonymous',
    count: 198,
    goal: 500,
    topic: 'Faith',
  },
  {
    title: 'Guidance for my daughter starting college',
    description: 'My daughter leaves for college next month. She is the first in our family to attend university, and while we are incredibly proud, we are also terrified. She is going to a school 800 miles away, and I worry about everything.',
    imageUrl: '/assets/open_book_morning_light.png',
    aiSummary: `My daughter leaves for college next month. She is the first in our family to attend university, and while we are incredibly proud, we are also terrified. She is going to a school 800 miles away, and I worry about everything.

I worry about her safety. I worry about the pressures she will face — academic, social, financial. I worry that she will lose her way in a world that does not always reward kindness and integrity. I worry that the values we have tried so hard to instill will be tested in ways we cannot prepare her for.

She has worked so hard to get here. She earned a partial scholarship through years of dedicated study while also working part-time to help our family. She is brilliant, kind, and determined. But she is also only eighteen, and the world can be unkind to the young.

We need prayers for her protection, for wisdom in choosing friends, for focus in her studies, and for the courage to stay true to herself when it would be easier to conform. Pray also for us, her parents, as we learn to let go and trust that she is ready for this next chapter.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring guidance and protection to this young scholar,
And healing and protection to
A family learning the bittersweet art of letting go.

Oh Divine Father of Life,
May Thy wondrous power flood her journey now,
Bringing hope wherever it touches,
Wisdom to every choice she faces,
And strength to her parents who watch from afar.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to shape her education,
To inspire the professors, mentors, and fellow students in her life
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed courage and discernment flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Maria Gonzalez',
    count: 334,
    goal: 500,
    topic: 'Education',
  },
  {
    title: 'Gratitude for surviving a life-threatening accident',
    description: 'Three months ago I was in a head-on collision that should have taken my life. The doctors said it was a miracle I survived. I have a long road of recovery ahead, but I am alive, and I want to give thanks.',
    imageUrl: '/assets/sunrise_gratitude_lake.png',
    aiSummary: `Three months ago I was in a head-on collision that should have taken my life. The doctors said it was a miracle I survived. I have a long road of recovery ahead, but I am alive, and I want to give thanks.

The accident happened on a rainy Tuesday evening. I was driving home from work when another car crossed the median. I remember the headlights, and then nothing. I woke up three days later in the ICU with a broken pelvis, shattered femur, collapsed lung, and traumatic brain injury.

The surgeons told my wife to prepare for the worst. My children were told their father might not come home. But here I am, three months later, learning to walk again, relearning things I once took for granted, and grateful for every painful step forward.

This is not a prayer of asking. It is a prayer of profound gratitude. I am thankful for the first responders who pulled me from the wreckage. For the surgeons whose steady hands saved my life. For my wife who has not left my side. For my children whose drawings cover my hospital room walls.

I ask that you join me in giving thanks, and that you pray for continued healing and for the strength to cherish every day I have been given.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We lift our voices in profound gratitude
For the miracle of survival,
For the gift of each new breath,
For the steady hands of healers
And the unwavering love of family.

Oh Divine Father of Life,
We thank Thee for Thy wondrous power,
For protecting this precious life,
For guiding the surgeons and first responders,
And for the strength that carries him forward each day.
Oh God, May he always feel Thy Presence.

We pray that Thy Loving power continues to flow
Through every step of this recovery,
Bringing healing to broken bones and weary spirits,
And renewed appreciation for the beauty of each moment.

Oh Divine Creator,
May this testimony of gratitude inspire us all
To cherish the gift of life,
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Thomas Reed',
    count: 876,
    goal: 1000,
    topic: 'Gratitude',
  },
  {
    title: 'Prayer for direction and purpose in life',
    description: 'I am 32 years old and feel completely lost. I have a degree I do not use, a job that feels meaningless, and a growing sense that I was made for something more but I cannot figure out what it is.',
    imageUrl: '/assets/forest_path_journey.png',
    aiSummary: `I am 32 years old and feel completely lost. I have a degree I do not use, a job that feels meaningless, and a growing sense that I was made for something more but I cannot figure out what it is.

Every morning I wake up and go through the motions. I commute to an office where I push papers and attend meetings that accomplish nothing. I come home exhausted but unsatisfied. On weekends I scroll through social media watching others live with passion and purpose while I wonder where mine went.

I used to dream big. As a child I wanted to change the world. As a teenager I believed I would. Somewhere along the way, practicality killed my dreams. I chose the safe path, the stable paycheck, the conventional life. And now I am drowning in the ordinariness of it all.

I do not want to be reckless. I have responsibilities and people who depend on me. But I cannot shake the feeling that there is a calling on my life that I have not yet answered. Something that would make me come alive.

I am asking for prayers for clarity, for divine direction, for the courage to step into whatever purpose God has for me, even if it means leaving the comfortable behind.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring clarity and purpose to this searching heart,
And healing and protection to
A soul longing to discover its true calling.

Oh Divine Father of Life,
May Thy wondrous power flood this life now,
Bringing hope wherever it touches,
Direction where there is confusion,
And courage to follow the path that is revealed.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are seeking their purpose in this world,
To illuminate the way forward with unmistakable signs
And surround them with mentors who speak truth.

Oh Divine Creator,
May much-needed vision and boldness flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'James Cooper',
    count: 156,
    goal: 300,
    topic: 'General',
  },
  {
    title: 'Protection for our environment and natural world',
    description: 'As wildfires rage across the western states and droughts threaten our farmlands, we are reminded of how fragile our relationship with the earth truly is. We are called to be stewards of creation, and we are failing.',
    imageUrl: '/assets/hands_planting_seedling.png',
    aiSummary: `As wildfires rage across the western states and droughts threaten our farmlands, we are reminded of how fragile our relationship with the earth truly is. We are called to be stewards of creation, and we are failing.

The fires have consumed millions of acres this season alone. Entire ecosystems have been destroyed. Animals have lost their habitats. Communities that have existed for generations are now ash. The air quality in cities hundreds of miles away is dangerous, and our children are kept indoors.

Meanwhile, our farmers face the worst drought in decades. Crops are withering in fields that once fed millions. Wells are running dry. Families who have farmed the same land for generations are being forced to sell because the rain simply will not come.

These are not just environmental problems. They are human problems. They affect the food on our tables, the air in our lungs, and the world we are leaving to our children.

We are praying for rain where it is needed, for containment of the fires, for wisdom for our leaders in addressing these challenges, and for a renewed commitment in all of us to care for the earth we have been given.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring restoration and balance to our natural world,
And healing and protection to
The lands, waters, and creatures suffering from our neglect.

Oh Divine Father of Life,
May Thy wondrous power flood this earth now,
Bringing rain where there is drought,
Relief where fires rage,
And wisdom to those who hold the power to enact change.
Oh God, May we all be reminded of our sacred duty.

We pray that Thy Loving power flows to all
Who are working to protect and restore creation,
To inspire the scientists, conservationists, and leaders in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed renewal and responsibility flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Green Valley Fellowship',
    count: 523,
    goal: 2000,
    topic: 'Community',
  },
  {
    title: 'Courage for a family facing deportation',
    description: 'Our neighbors, the Ramirez family, are facing deportation proceedings. They have lived in our community for fifteen years, contributing, working, and raising three American-born children. Now they face being torn apart.',
    imageUrl: '/assets/lighthouse_strength_sunset.png',
    aiSummary: `Our neighbors, the Ramirez family, are facing deportation proceedings. They have lived in our community for fifteen years, contributing, working, and raising three American-born children. Now they face being torn apart.

Carlos and Elena came to this country seeking a better life for their family. They have worked tirelessly — Carlos in construction, Elena as a home health aide for elderly neighbors. Their children, ages 8, 12, and 15, are honor roll students who volunteer at the local food bank every Saturday.

The legal proceedings began six months ago. The family lives in constant fear of a knock on the door. The children have nightmares about being separated from their parents. The oldest, Sofia, has started hiding important documents in her backpack in case she comes home from school and her parents are gone.

This is not a political prayer request. It is a prayer for a family we love. Whatever one believes about immigration policy, no one can look into the eyes of these children and not feel the weight of their fear.

We ask for prayers for a just resolution, for legal protection, for peace for the children, and for our community to surround this family with love and support regardless of the outcome.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring justice and mercy to this beloved family,
And healing and protection to
Children who should never have to carry such fear.

Oh Divine Father of Life,
May Thy wondrous power flood their situation now,
Bringing hope wherever it touches,
Justice where it is needed most,
And strength to face each uncertain day.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping to bring a just resolution,
To inspire the judges, lawyers, and advocates in their work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed compassion and fairness flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Maple Street Neighbors',
    count: 1567,
    goal: 3000,
    topic: 'Faith',
  },
  {
    title: 'Thankfulness for answered prayers and new beginnings',
    description: 'Two years ago I submitted a prayer request on this site asking for help with my addiction. Today I am celebrating two years of sobriety, and I want the world to know that prayers are answered.',
    imageUrl: '/assets/hand_releasing_bird_hope.png',
    aiSummary: `Two years ago I submitted a prayer request on this site asking for help with my addiction. Today I am celebrating two years of sobriety, and I want the world to know that prayers are answered.

My addiction started innocently enough — a prescription for pain medication after a back surgery that slowly consumed my entire life. Within a year I had lost my job, my apartment, and the trust of everyone who loved me. I was living in my car, spending every dollar I could find on pills, and contemplating ending it all.

The night I hit rock bottom, I found this website. Through tears I could barely see through, I typed out a desperate prayer request. I did not expect anything to happen. But within days, a stranger from this community reached out. Then another. They helped me find a treatment center. They prayed for me daily. They called to check on me when I wanted to give up.

Recovery has been the hardest thing I have ever done. There have been days I wanted to quit, moments I almost relapsed, nights I cried myself to sleep. But I kept going, buoyed by the prayers of people I had never met.

Today I have a small apartment, a steady job, and I am slowly rebuilding relationships with my family. I am not where I want to be, but I am so far from where I was. This prayer is my thank you — to God, to this community, and to everyone who believed I was worth saving when I did not believe it myself.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We lift our hearts in joyful thanksgiving
For the miracle of recovery,
For the chains that have been broken,
For the new life that blooms
Where addiction once held dominion.

Oh Divine Father of Life,
We thank Thee for Thy wondrous power,
For the strangers who became lifelines,
For the treatment centers and counselors,
And for the daily strength to choose sobriety.
Oh God, May this testimony inspire others who struggle.

We pray that Thy Loving power continues to flow
Through every person fighting addiction,
Reminding them that they are worthy of recovery
And that their story is not over.

Oh Divine Creator,
May this gratitude ripple outward
To every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Recovered and Grateful',
    count: 2134,
    goal: 2500,
    topic: 'Gratitude',
  },
];

export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    const existing = await db.select().from(prayers).limit(1);
    if (existing.length > 0) {
      console.log('Database already has data, updating existing seed prayers...');
      const allTitles = SEED_PRAYERS.map(s => s.title);
      const existingPrayers = await db
        .select({ title: prayers.title })
        .from(prayers)
        .where(inArray(prayers.title, allTitles));
      const existingTitles = new Set(existingPrayers.map(p => p.title));

      for (const seed of SEED_PRAYERS) {
        if (existingTitles.has(seed.title)) {
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
      }
      console.log('Existing seed prayers updated!');

      const newPrayers = SEED_PRAYERS.filter(s => !existingTitles.has(s.title));
      if (newPrayers.length > 0) {
        await db.insert(prayers).values(newPrayers);
        console.log(`Inserted ${newPrayers.length} new seed prayers!`);
      } else {
        console.log('No new seed prayers to insert.');
      }
      return;
    }

    await db.insert(prayers).values(SEED_PRAYERS);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
