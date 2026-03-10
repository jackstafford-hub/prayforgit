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
  {
    title: 'Prayer for my son returning from deployment',
    description: 'My son has been deployed overseas for nine months. He comes home in three weeks, and while I am overjoyed, I am also worried about the invisible wounds he may carry. I have heard his voice change over these months.',
    imageUrl: '/assets/work_boots_new_day.png',
    aiSummary: `My son has been deployed overseas for nine months. He comes home in three weeks, and while I am overjoyed, I am also worried about the invisible wounds he may carry. I have heard his voice change over these months.

He left as a bright-eyed young man full of purpose. On our video calls now, I see a weariness in his eyes that no amount of reassurance can erase. He tells me he is fine, but a mother knows. There are things he has seen and done that he will never share with me, and I understand that.

I worry about the transition back to civilian life. I have read the statistics about veterans struggling with PTSD, depression, and isolation. I have heard stories of families torn apart by the invisible injuries of war.

All I want is for my son to come home whole — in body and in spirit. I want him to find peace, to sleep without nightmares, to laugh freely again. I want him to know that whatever he has been through, he is not alone.

I am asking for prayers for his safe return, for healing of whatever wounds he carries, for patience and understanding from our family, and for the support systems he will need in the months ahead.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring safe passage and wholeness to this brave soul,
And healing and protection to
A heart carrying the weight of service and sacrifice.

Oh Divine Father of Life,
May Thy wondrous power flood his homecoming now,
Bringing hope wherever it touches,
Healing to wounds both seen and unseen,
And strength to a family learning to be whole again.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping veterans find their way home,
To inspire the counselors, doctors, and loved ones in their care
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed peace and restoration flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Linda Martinez',
    count: 445,
    goal: 1000,
    topic: 'Health',
  },
  {
    title: 'Strength for nurses on the front lines',
    description: 'I am a nurse and I am exhausted. After years of working through crisis after crisis, I feel like I have nothing left to give. But every shift there are patients who need me, and I cannot walk away.',
    imageUrl: '/assets/poppy_resilience_field.png',
    aiSummary: `I am a nurse and I am exhausted. After years of working through crisis after crisis, I feel like I have nothing left to give. But every shift there are patients who need me, and I cannot walk away.

I became a nurse because I wanted to help people. I wanted to hold the hand of someone who was scared, to bring comfort in the darkest moments, to be the person who never gave up on a patient. And I have done those things, thousands of times.

But the toll is real. I have lost count of how many patients I have watched take their last breath. I have comforted families in waiting rooms with news that would shatter their world. I have held it together at work only to fall apart in my car in the parking lot.

My colleagues are leaving the profession in droves. Those of us who remain are stretched impossibly thin, working double shifts, skipping meals, carrying the emotional weight of a system that is broken.

I am not asking for prayers for myself alone, but for every healthcare worker who shows up every day despite being depleted. Pray for our strength, our mental health, our families who sacrifice alongside us, and for a system that truly supports the people who care for others.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring renewal and strength to those who heal others,
And healing and protection to
The caregivers who pour themselves out each day.

Oh Divine Father of Life,
May Thy wondrous power flood every hospital and clinic now,
Bringing hope wherever it touches,
Rest to the weary,
And strength to continue this sacred work.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are caring for the sick and suffering,
To sustain the nurses, doctors, and aides in their tireless service
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed support and recognition flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Rachel Thompson, RN',
    count: 1876,
    goal: 2500,
    topic: 'Health',
  },
  {
    title: 'Wisdom for my teenager navigating peer pressure',
    description: 'My fifteen-year-old daughter is struggling. She has always been a good kid, but the pressures of high school are testing her in ways I never anticipated. I found messages on her phone that broke my heart.',
    imageUrl: '/assets/bicycles_parent_child.png',
    aiSummary: `My fifteen-year-old daughter is struggling. She has always been a good kid, but the pressures of high school are testing her in ways I never anticipated. I found messages on her phone that broke my heart.

Her friend group has changed. The girls she grew up with have been replaced by peers who encourage her to skip class, experiment with substances, and post things online that could follow her forever. I see her changing — the way she talks, the way she dresses, the way she rolls her eyes at the values we have always shared.

I have tried talking to her. Sometimes she listens. More often she tells me I do not understand, that the world is different now, that I am overreacting. And maybe she is partly right — I do not fully understand the pressures of growing up in the age of social media and constant comparison.

But I know my daughter. Beneath the bravado is a scared girl trying to figure out who she is. She is smart, creative, and capable of so much good. I refuse to lose her to the wrong crowd.

I am asking for prayers for wisdom — for me as a parent, and for her as she navigates these treacherous years. Pray for the right friends to enter her life. Pray for her to see her own worth without needing the approval of people who do not have her best interests at heart.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring wisdom and protection to this precious teenager,
And healing and protection to
A parent watching their child navigate a difficult world.

Oh Divine Father of Life,
May Thy wondrous power flood this family now,
Bringing hope wherever it touches,
Discernment to a young mind facing hard choices,
And patience to parents who love fiercely.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are guiding young people through adolescence,
To inspire the teachers, counselors, and mentors in their work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed guidance and true friendship flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Concerned Mother',
    count: 723,
    goal: 1000,
    topic: 'Family',
  },
  {
    title: 'Healing for a family after the loss of a child',
    description: 'Six months ago we lost our four-year-old son to leukemia. He fought bravely for two years, and in the end, his little body just could not fight anymore. Our family is shattered.',
    imageUrl: '/assets/birds_building_nest.png',
    aiSummary: `Six months ago we lost our four-year-old son to leukemia. He fought bravely for two years, and in the end, his little body just could not fight anymore. Our family is shattered.

His name was Ethan, and he loved dinosaurs, pancakes, and jumping in puddles. He had a laugh that could fill a room and a smile that made strangers stop to say hello. He was brave in ways that no four-year-old should ever have to be.

The grief is unlike anything I have ever experienced. It comes in waves that knock me to the ground when I least expect it. I find his toy cars under the couch. I hear a child laugh at the grocery store and my heart stops. His bedroom door stays closed because none of us can bear to open it.

My wife and I are trying to hold each other up, but we grieve differently, and sometimes our pain pushes us apart instead of pulling us together. Our eight-year-old daughter does not understand why her brother is not coming back, and we do not have the words to explain it.

We need prayers for healing — not the kind that erases the pain, because we know that will never fully go away. We need prayers for the strength to carry it, for our marriage to survive it, and for our daughter to grow up knowing that love does not end with death.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring comfort and endurance to this grieving family,
And healing and protection to
Hearts broken by the loss of a precious child.

Oh Divine Father of Life,
May Thy wondrous power flood this home now,
Bringing hope wherever it touches,
Comfort in the unbearable moments,
And strength to carry grief with grace.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping this family through their loss,
To inspire the counselors, friends, and loved ones who surround them
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed peace and enduring love flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'The Morrison Family',
    count: 3456,
    goal: 5000,
    topic: 'Family',
  },
  {
    title: 'Prayer for affordable housing in our city',
    description: 'Rent in our city has doubled in five years. Families who have lived here for generations are being pushed out. Teachers, nurses, and firefighters cannot afford to live in the communities they serve.',
    imageUrl: '/assets/community_garden_bloom.png',
    aiSummary: `Rent in our city has doubled in five years. Families who have lived here for generations are being pushed out. Teachers, nurses, and firefighters cannot afford to live in the communities they serve.

I work at a community center and every week I see the devastation firsthand. A single mother of three who works two jobs but still cannot make rent. An elderly couple on fixed income who received an eviction notice after forty years in their apartment. A young teacher who sleeps in her car because she cannot find anything affordable within an hour of her school.

These are not statistics. These are people with names and faces and stories. They are the backbone of our community, and we are losing them one by one to cities and towns where they know no one, far from the support systems that sustained them.

We need systemic change, and we need it urgently. But while we work toward solutions, we also need immediate relief for families on the brink. We need landlords with compassion, developers with conscience, and leaders with courage.

I am asking for prayers for every family facing housing insecurity. Pray for creative solutions, for policy changes, for the hearts of decision-makers to be moved, and for our community to rally around those who are most vulnerable.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring shelter and stability to families in need,
And healing and protection to
Communities being torn apart by displacement.

Oh Divine Father of Life,
May Thy wondrous power flood our cities now,
Bringing hope wherever it touches,
Affordable homes where there is scarcity,
And compassion where there is indifference.
Oh God, May all who struggle be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are working to solve the housing crisis,
To inspire the leaders, developers, and advocates in their work
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed justice and shelter flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Harbor Community Center',
    count: 934,
    goal: 2000,
    topic: 'Community',
  },
  {
    title: 'Unity for a divided congregation',
    description: 'Our church is splitting apart. A disagreement over leadership has turned into a full-blown division that has destroyed friendships, divided families, and poisoned what was once a loving community.',
    imageUrl: '/assets/patchwork_quilt_community.png',
    aiSummary: `Our church is splitting apart. A disagreement over leadership has turned into a full-blown division that has destroyed friendships, divided families, and poisoned what was once a loving community.

It started small — a difference of opinion about the direction of our outreach programs. But egos got involved, sides were chosen, and before anyone realized what was happening, the church that had been our family for decades became a battlefield.

Sunday mornings, once filled with joy and fellowship, are now tense and awkward. People who used to share meals together now sit on opposite sides of the sanctuary. The parking lot after service has become a place of whispered conversations and pointed glances.

The children are confused. The elderly members are heartbroken. And the community we serve — the people who depend on us for food programs, counseling, and support — are caught in the crossfire of our inability to resolve our differences.

I am asking for prayers for reconciliation. Not the kind where one side wins and the other loses, but the kind where everyone remembers why we came together in the first place. Pray for humility, for forgiveness, for leaders who put unity above ego, and for the courage to choose love over being right.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring reconciliation and unity to this divided community,
And healing and protection to
Hearts hardened by pride and wounded by conflict.

Oh Divine Father of Life,
May Thy wondrous power flood this congregation now,
Bringing hope wherever it touches,
Humility where there is pride,
And forgiveness where there is bitterness.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are working to mend this division,
To inspire the pastors, elders, and members in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed grace and reconciliation flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'A Grieving Church Member',
    count: 287,
    goal: 500,
    topic: 'Community',
  },
  {
    title: 'Peace for the people of Ukraine',
    description: 'The war in Ukraine continues to devastate millions of lives. Families are separated, cities are in ruins, and an entire generation of children knows nothing but conflict. We must continue to pray for peace.',
    imageUrl: '/assets/lanterns_peace_rising.png',
    aiSummary: `The war in Ukraine continues to devastate millions of lives. Families are separated, cities are in ruins, and an entire generation of children knows nothing but conflict. We must continue to pray for peace.

The images from Ukraine haunt us — apartment buildings reduced to rubble, elderly people huddled in basements, children drawing pictures of tanks and explosions because that is the only reality they know. The scale of human suffering is almost impossible to comprehend.

Millions have been displaced. Families torn apart — fathers staying to fight while mothers and children flee to countries where they do not speak the language and have no connections. Grandparents who refuse to leave the homes they have lived in for decades, even as the bombs fall around them.

The bravery of the Ukrainian people is extraordinary. Teachers holding classes in bomb shelters. Doctors performing surgeries by flashlight. Ordinary citizens risking their lives to deliver food and medicine to besieged neighborhoods.

We are asking for prayers for an end to this war, for protection of civilians, for the refugees who have lost everything, for the soldiers on all sides who are someone's child, and for the leaders of the world to find the courage and wisdom to stop the killing.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring peace and restoration to Ukraine,
And healing and protection to
Every person caught in the devastation of war.

Oh Divine Father of Life,
May Thy wondrous power flood this land now,
Bringing hope wherever it touches,
Shelter to the displaced,
And strength to those who endure unimaginable hardship.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are working to bring peace,
To inspire the diplomats, aid workers, and peacemakers in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed peace and justice flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Global Prayer Network',
    count: 4521,
    goal: 10000,
    topic: 'World Peace',
  },
  {
    title: 'End to gun violence in our schools',
    description: 'Another school shooting. Another community shattered. Another group of parents who sent their children to school and never got to hold them again. We cannot become numb to this. We must pray and we must act.',
    imageUrl: '/assets/olive_branches_unity.png',
    aiSummary: `Another school shooting. Another community shattered. Another group of parents who sent their children to school and never got to hold them again. We cannot become numb to this. We must pray and we must act.

Every parent in America knows the fear. The moment your phone buzzes with a news alert and your heart stops until you confirm your child is safe. The conversations we have with our kids about lockdown drills — conversations no parent should ever have to have.

The children are not alright. They practice hiding under desks. They learn to barricade doors. They say goodbye to their parents in the morning wondering if it might be the last time. This is not normal, and we must never accept it as normal.

We are not praying for one side of a political debate. We are praying for our children. We are praying for solutions that protect the most innocent among us. We are praying for the courage to have difficult conversations and the wisdom to find common ground.

We ask for prayers for every child who walks into a school with fear, for every teacher who stands ready to shield their students with their own body, for every parent who holds their breath until the final bell rings, and for our nation to find the will to protect its youngest citizens.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring safety and peace to our schools,
And healing and protection to
Every child, teacher, and family living in fear.

Oh Divine Father of Life,
May Thy wondrous power flood our schools now,
Bringing hope wherever it touches,
Safety where there is danger,
And courage to those who seek solutions.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are working to protect our children,
To inspire the leaders, educators, and advocates in their efforts
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed change and protection flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Parents for Safe Schools',
    count: 6234,
    goal: 10000,
    topic: 'World Peace',
  },
  {
    title: 'Prayer for my small business to survive',
    description: 'I started my bakery three years ago with everything I had. It was my dream since childhood. Now rising costs, supply chain issues, and a changing economy threaten to take it all away.',
    imageUrl: '/assets/crossroads_career_paths.png',
    aiSummary: `I started my bakery three years ago with everything I had. It was my dream since childhood. Now rising costs, supply chain issues, and a changing economy threaten to take it all away.

I mortgaged my house to open this shop. I spent a year renovating the space myself — painting walls at midnight, installing equipment on weekends, perfecting recipes until they were just right. When we opened our doors, the community embraced us. Lines around the block. Rave reviews. For a while, it felt like a fairy tale.

Then costs started climbing. Flour, butter, eggs — everything doubled. I could not raise prices fast enough without losing customers. Then my main supplier went out of business. Then the strip mall raised the rent by forty percent.

I have four employees who depend on this job. They are like family — they believed in this dream alongside me. The thought of telling them we are closing keeps me up at night.

I am not giving up. I am exploring every option — online sales, catering, partnerships with local restaurants. But I need a breakthrough, and I need it soon. I am asking for prayers for creative solutions, for favor with lenders, for loyal customers to spread the word, and for the endurance to keep going when every instinct says to quit.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring provision and breakthrough to this small business,
And healing and protection to
An entrepreneur fighting to keep a dream alive.

Oh Divine Father of Life,
May Thy wondrous power flood this business now,
Bringing hope wherever it touches,
Creative solutions where there seem to be none,
And loyal supporters who believe in this vision.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are fighting to sustain their livelihoods,
To inspire the customers, advisors, and partners in their support
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed resources and opportunity flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Elena Rossi',
    count: 312,
    goal: 500,
    topic: 'Employment',
  },
  {
    title: 'Guidance for a career change at fifty',
    description: 'At fifty-two years old, I have been laid off from the only industry I have ever known. The technology that replaced me is not going away, and I must reinvent myself. But starting over at this age terrifies me.',
    imageUrl: '/assets/compass_open_landscape.png',
    aiSummary: `At fifty-two years old, I have been laid off from the only industry I have ever known. The technology that replaced me is not going away, and I must reinvent myself. But starting over at this age terrifies me.

I spent twenty-eight years in manufacturing. I worked my way up from the floor to management, earning certifications, learning new processes, leading teams. I was proud of what I built. Then the company automated my entire department and eliminated my position along with forty others.

The job market is brutal for someone my age. Recruiters look at my resume and see decades of experience in a dying field. I see younger candidates with half my work ethic getting hired for positions I am overqualified for. The rejection is humbling in ways I never expected.

My wife is supportive, but I can see the worry in her eyes. Our youngest is in college, we still have a mortgage, and our savings will only last so long. I have started taking online courses in project management and data analysis, trying to bridge the gap between what I know and what the market wants.

I believe there is purpose in this season, even if I cannot see it yet. I am asking for prayers for direction, for opportunities that value experience and character, for the courage to learn new things, and for peace in the waiting.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring new direction and opportunity to this seasoned worker,
And healing and protection to
A spirit learning to begin again with courage.

Oh Divine Father of Life,
May Thy wondrous power flood this transition now,
Bringing hope wherever it touches,
New doors where old ones have closed,
And confidence that experience is a gift, not a liability.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are navigating career transitions later in life,
To inspire the employers and mentors who see the value of wisdom
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed opportunity and renewal flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Robert Chen',
    count: 198,
    goal: 300,
    topic: 'Employment',
  },
  {
    title: 'Prayer for teachers shaping the next generation',
    description: 'I am a public school teacher in an underfunded district. My classroom has thirty-five students, outdated textbooks, and not enough chairs. But these children deserve the best education possible, and I refuse to give them anything less.',
    imageUrl: '/assets/library_autumn_learning.png',
    aiSummary: `I am a public school teacher in an underfunded district. My classroom has thirty-five students, outdated textbooks, and not enough chairs. But these children deserve the best education possible, and I refuse to give them anything less.

I spend my own money on supplies — markers, paper, snacks for kids who come to school hungry. I arrive at six in the morning and leave at six in the evening. I tutor during lunch. I write college recommendation letters on weekends. And my salary barely covers my own rent.

But when a struggling student finally grasps a concept and their eyes light up — that moment is worth everything. When a shy child reads aloud for the first time and the whole class cheers — that is why I teach. When a former student writes to tell me I changed their life — I know I am exactly where I am supposed to be.

The system is broken, but the children are not. They are brilliant, curious, resilient, and full of potential. They deserve teachers who believe in them, resources that support them, and a society that values their education.

I am asking for prayers for every teacher who shows up for their students despite impossible odds. Pray for resources, for fair compensation, for public support, and for the stamina to keep going when the system makes it so hard to stay.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring support and recognition to every dedicated teacher,
And healing and protection to
Educators pouring their hearts into shaping young minds.

Oh Divine Father of Life,
May Thy wondrous power flood every classroom now,
Bringing hope wherever it touches,
Resources where there is scarcity,
And energy to those who give everything they have.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are investing in education,
To inspire the leaders, parents, and communities who support our schools
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed funding and appreciation flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Ms. Angela Davis',
    count: 1245,
    goal: 2000,
    topic: 'Education',
  },
  {
    title: 'Scholarship prayers for first-generation students',
    description: 'I am the advisor for a college-prep program serving first-generation students from low-income families. Twelve of my students have been accepted to universities but cannot afford to attend without scholarships.',
    imageUrl: '/assets/graduation_cherry_blossoms.png',
    aiSummary: `I am the advisor for a college-prep program serving first-generation students from low-income families. Twelve of my students have been accepted to universities but cannot afford to attend without scholarships.

These students have overcome obstacles that would have defeated many adults. They have studied in homeless shelters, worked night shifts to support their families, translated at parent-teacher conferences for parents who do not speak English, and still managed to earn grades that got them accepted to excellent schools.

But acceptance letters do not pay tuition. The gap between what financial aid covers and what these families can afford is often tens of thousands of dollars. For families living paycheck to paycheck, even a few hundred dollars can be the difference between attending college and watching a dream die.

Every year I watch brilliant students settle for less — not because they are not good enough, but because the system was not built for them. Some give up on college entirely. Others take on crushing debt that will follow them for decades.

I am asking for prayers for every first-generation student who has been told that people like them do not go to college. Pray for scholarships to appear, for generous donors to step forward, for financial aid offices to find creative solutions, and for these students to know that their dreams are valid and achievable.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring opportunity and provision to these deserving students,
And healing and protection to
Young minds whose potential should never be limited by circumstance.

Oh Divine Father of Life,
May Thy wondrous power flood their applications now,
Bringing hope wherever it touches,
Scholarships where there is financial need,
And doors that open wide for those who have earned their place.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are investing in the future of these students,
To inspire the donors, institutions, and mentors in their generosity
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed funding and encouragement flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'First Steps College Prep',
    count: 567,
    goal: 1000,
    topic: 'Education',
  },
  {
    title: 'Thankfulness for twenty years of marriage',
    description: 'Today my wife and I celebrate twenty years of marriage. It has not always been easy, but it has always been worth it. I want to pause and give thanks for the gift of a love that has endured.',
    imageUrl: '/assets/harvest_abundance_gratitude.png',
    aiSummary: `Today my wife and I celebrate twenty years of marriage. It has not always been easy, but it has always been worth it. I want to pause and give thanks for the gift of a love that has endured.

We married young — too young, everyone said. We had no money, no plan, and no idea how hard marriage would be. But we had each other, and somehow that was enough.

We have weathered things that would have broken weaker bonds. Financial hardship that lasted years. The loss of parents. A miscarriage that nearly destroyed us. Arguments that shook the walls. Silences that lasted too long.

But for every hard season, there have been a hundred beautiful moments. The birth of our three children. Lazy Sunday mornings making pancakes. Dancing in the kitchen to old songs. Road trips where we got lost and did not care. Inside jokes that still make us laugh after two decades.

She is my best friend, my partner, and the person I want beside me when the world falls apart. She has made me a better man simply by believing I could be one.

This prayer is not asking for anything. It is a prayer of gratitude for a love that chose to stay, to fight, to forgive, and to grow. If you are struggling in your marriage, let our story give you hope — it gets better when you refuse to give up on each other.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We lift our hearts in joyful celebration
For the gift of enduring love,
For a marriage that has weathered storms and emerged stronger,
For the daily choice to stay, to forgive, and to grow together.

Oh Divine Father of Life,
We thank Thee for Thy wondrous power,
For sustaining this union through twenty years,
For the children born of this love,
And for every small moment of grace along the way.
Oh God, May this love continue to deepen.

We pray that Thy Loving power continues to flow
Through every marriage that struggles to survive,
Reminding all couples that love is a choice made new each morning
And that the best chapters are still being written.

Oh Divine Creator,
May this testimony of enduring love inspire us all
To invest in our relationships with patience and grace,
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Daniel and Sarah Moore',
    count: 1456,
    goal: 2000,
    topic: 'Gratitude',
  },
  {
    title: 'Gratitude for a community that saved my life',
    description: 'Last winter I was homeless, hungry, and ready to give up. A stranger at a soup kitchen looked me in the eye and said, You matter. Those two words changed everything. Today I have a home, a job, and a reason to live.',
    imageUrl: '/assets/fireflies_summer_gratitude.png',
    aiSummary: `Last winter I was homeless, hungry, and ready to give up. A stranger at a soup kitchen looked me in the eye and said, You matter. Those two words changed everything. Today I have a home, a job, and a reason to live.

I will not sugarcoat how I got there. Bad decisions, broken relationships, and an unwillingness to ask for help until it was almost too late. By the time I found myself sleeping under a bridge in January, I had burned every bridge with everyone who had ever loved me.

The soup kitchen was my last resort. I went for the food, expecting nothing else. But the volunteer who served me — a woman named Margaret — did something no one had done in months. She looked at me. Not through me, not past me, but directly at me. And she said those words that cracked something open inside me.

She connected me with a transitional housing program. A case worker helped me get my documents in order. A local business owner took a chance and hired me. A church group furnished my apartment with donated furniture.

None of these people owed me anything. I was a stranger, and they chose to help anyway. That is the kind of community I want to spend the rest of my life building and giving back to.

This prayer is my thank you to every person who has ever looked at someone society has discarded and decided they were worth saving.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We lift our hearts in humble gratitude
For the strangers who become saviors,
For the communities that wrap around the broken,
For two simple words — You matter —
That changed the course of a life.

Oh Divine Father of Life,
We thank Thee for Thy wondrous power,
Working through soup kitchen volunteers and case workers,
Through business owners who take chances on people,
And through every act of kindness that restores dignity.
Oh God, May this gratitude overflow into service.

We pray that Thy Loving power continues to flow
Through every shelter, soup kitchen, and outreach program,
Reminding those who serve that their work is never wasted
And those who receive that they are worthy of love.

Oh Divine Creator,
May this testimony inspire compassion in us all,
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Marcus Williams',
    count: 2876,
    goal: 3000,
    topic: 'Gratitude',
  },
  {
    title: 'Trusting God through chronic illness',
    description: 'I was diagnosed with multiple sclerosis at age twenty-nine. I am now thirty-five and learning to live with a body that no longer works the way it should. Some days I am angry. Some days I am scared. But most days I choose faith.',
    imageUrl: '/assets/garden_archway_faith.png',
    aiSummary: `I was diagnosed with multiple sclerosis at age twenty-nine. I am now thirty-five and learning to live with a body that no longer works the way it should. Some days I am angry. Some days I am scared. But most days I choose faith.

The diagnosis came during what was supposed to be the best year of my life. I had just gotten engaged, received a promotion, and was training for a marathon. Then the numbness started. Then the fatigue. Then the MRI that showed lesions on my brain and spinal cord.

My fiance stayed. We got married six months later. She is my rock, but I see the worry she tries to hide. The fear that one day I will not be able to walk, or see, or remember her name. MS is unpredictable — some days I feel almost normal, other days I cannot get out of bed.

I have had to grieve the future I imagined. The career I planned. The active lifestyle I loved. The certainty of growing old on my own terms. In its place, I am learning to build a different kind of life — one that measures success not by achievement but by presence.

I am not asking for a miracle cure, though I would not turn one down. I am asking for prayers for the strength to live fully within my limitations, for my wife who carries this burden alongside me, and for everyone fighting an invisible illness that others cannot see.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring strength and peace to those living with chronic illness,
And healing and protection to
A spirit choosing faith in the face of uncertainty.

Oh Divine Father of Life,
May Thy wondrous power flood this body and mind now,
Bringing hope wherever it touches,
Strength for the difficult days,
And joy in the moments of grace between them.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who walk alongside those with chronic conditions,
To inspire the spouses, caregivers, and researchers in their dedication
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed courage and acceptance flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Nathan Brooks',
    count: 678,
    goal: 1000,
    topic: 'Faith',
  },
  {
    title: 'Finding God after leaving an abusive religious group',
    description: 'I spent fifteen years in a religious group that I now understand was a cult. When I finally left, I lost my entire community, my sense of identity, and my relationship with God. I am trying to find my way back.',
    imageUrl: '/assets/lantern_boat_fog_faith.png',
    aiSummary: `I spent fifteen years in a religious group that I now understand was a cult. When I finally left, I lost my entire community, my sense of identity, and my relationship with God. I am trying to find my way back.

I joined when I was nineteen — young, idealistic, and hungry for meaning. They offered certainty in a confusing world, community in a lonely city, and purpose for a life that felt directionless. For years I believed I had found the truth.

But slowly the control became apparent. We were told who to marry, where to live, how to think. Questioning was punished. Leaving was unthinkable — they said we would lose our salvation. Fear kept us in line.

When I finally left, I lost everything. My friends were instructed not to speak to me. My family within the group cut me off. I walked out with nothing but the clothes on my back and a shattered understanding of God.

The hardest part is not knowing what to believe anymore. The God they taught me about was angry, controlling, and conditional. I know in my head that is not the real God, but my heart has not caught up yet. Prayer feels dangerous. Trust feels impossible. Faith feels like walking blindfolded across a minefield.

I am asking for prayers for every person rebuilding their faith after spiritual abuse. Pray for healing, for patient communities that welcome the wounded, for therapists who understand religious trauma, and for the courage to believe that God is nothing like the people who misused His name.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring restoration to those wounded by spiritual abuse,
And healing and protection to
A soul bravely seeking authentic faith after betrayal.

Oh Divine Father of Life,
May Thy wondrous power flood this healing journey now,
Bringing hope wherever it touches,
A true picture of who You are,
And safe communities for the spiritually wounded.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are recovering from religious manipulation,
To inspire the therapists, pastors, and friends who walk with them
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed truth and gentle restoration flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Healing and Free',
    count: 945,
    goal: 1500,
    topic: 'Faith',
  },
  {
    title: 'Prayer for meaning in the midst of grief',
    description: 'My wife passed away six months ago after a sudden heart attack. She was fifty-one years old, healthy, vibrant, and the center of my universe. One morning she was making coffee. By noon she was gone.',
    imageUrl: '/assets/boat_twilight_lake.png',
    aiSummary: `My wife passed away six months ago after a sudden heart attack. She was fifty-one years old, healthy, vibrant, and the center of my universe. One morning she was making coffee. By noon she was gone.

There were no warning signs. No time to prepare. No chance to say the things I always assumed I would have time to say. The doctors told me it was a massive cardiac event — rare in women her age, but not unheard of. That medical explanation does nothing to fill the silence in our house.

I still set two coffee cups on the counter every morning before I catch myself. I still roll over in bed reaching for her. I still hear her laugh in crowded rooms and turn expecting to see her face.

Our adult children are grieving too, each in their own way. Our son has become withdrawn. Our daughter calls me every night, and I can hear her trying to be strong for me while falling apart herself. We are all stumbling through this fog, bumping into each other's pain.

I am not asking why — I have learned that question has no satisfying answer. I am asking for prayers for the strength to keep living in a world that no longer includes her. For the ability to find joy again without feeling guilty. For my children as they grieve the loss of their mother. And for the hope that love somehow persists beyond death.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring comfort and meaning to this grieving husband,
And healing and protection to
A family learning to live in the absence of their beloved.

Oh Divine Father of Life,
May Thy wondrous power flood this home now,
Bringing hope wherever it touches,
Comfort in the unbearable silence,
And permission to find joy again without guilt.
Oh God, May they all be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are walking through sudden, devastating loss,
To remind them that grief is the price we pay for love
And that love does not end with death.

Oh Divine Creator,
May much-needed peace and gentle healing flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'William Hartley',
    count: 2345,
    goal: 3000,
    topic: 'General',
  },
  {
    title: 'Overcoming anxiety and finding inner peace',
    description: 'I have struggled with severe anxiety for as long as I can remember. It is not just worrying — it is a constant, paralyzing fear that something terrible is about to happen. I am tired of being held hostage by my own mind.',
    imageUrl: '/assets/healing_hands_bird_nest.png',
    aiSummary: `I have struggled with severe anxiety for as long as I can remember. It is not just worrying — it is a constant, paralyzing fear that something terrible is about to happen. I am tired of being held hostage by my own mind.

It affects everything. I have turned down job opportunities because the interviews terrified me. I have missed weddings, birthdays, and graduations because the thought of being in a crowd made me physically ill. I have lain awake at three in the morning with my heart pounding, convinced I am dying, only to be told by the emergency room doctor that it is another panic attack.

I am in therapy. I take medication. I practice breathing exercises and mindfulness and all the things the books tell you to do. Some days they help. Other days the anxiety laughs at my coping mechanisms and takes over anyway.

The loneliest part is that people do not understand. They tell me to just relax, as if I have never thought of that. They tell me to think positive, as if my brain chemistry responds to motivational posters. They mean well, but their words often make me feel more broken, not less.

I am asking for prayers for everyone who fights this invisible battle daily. Pray for peace that surpasses understanding. Pray for effective treatment. Pray for loved ones to have patience. And pray for the day when my mind is finally quiet enough to hear the still small voice that says, Do not be afraid.`,
    recitablePrayer: `Oh Mighty God, Creator of Life,
We ask that we may be used as Channels for
Thy vibrant Healing Power to flow through us
In a living stream of radiant loving energy
To bring peace and stillness to anxious minds,
And healing and protection to
All who fight the daily battle against fear and panic.

Oh Divine Father of Life,
May Thy wondrous power flood every racing thought now,
Bringing hope wherever it touches,
Calm where there is chaos,
And rest where there is restlessness.
Oh God, May they be comforted by Thy Presence.

We pray that Thy Loving power flows to all
Who are helping those with anxiety find relief,
To inspire the therapists, doctors, and loved ones in their care
With clarity, wisdom, love, understanding.

Oh Divine Creator,
May much-needed peace and freedom flow now
From every corner of our world
In the realization that we are one human family,
Sharing in our grief and in our joy.
Oh God, we thank you for this opportunity to be of Service.
May Thy Will be Done.`,
    author: 'Seeking Stillness',
    count: 1567,
    goal: 2000,
    topic: 'General',
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
