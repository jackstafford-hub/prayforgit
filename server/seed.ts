import { db } from "./db";
import { prayers } from "@shared/schema";

const SEED_PRAYERS = [
  {
    title: 'Healing for my mother fighting cancer',
    description: 'My mother was diagnosed with stage 4 breast cancer six months ago. The diagnosis came as a complete shock to our family. She has always been the pillar of our home, the one who held us together through every storm. Now she is fighting the biggest battle of her life.',
    imageUrl: '/assets/older_woman_hands_holding_bible_in_hospital.png',
    aiSummary: `My mother was diagnosed with stage 4 breast cancer six months ago. The diagnosis came as a complete shock to our family. She has always been the pillar of our home, the one who held us together through every storm. Now she is fighting the biggest battle of her life.

The cancer has spread to her lymph nodes and the doctors have told us that the prognosis is uncertain. She has undergone three rounds of chemotherapy so far, and each treatment takes more out of her. We watch her lose her hair, her appetite, and sometimes her hope. But we refuse to give up.

We believe in a God who performs miracles. We believe that no diagnosis is beyond His reach. We are asking the prayer community to stand with us in faith, believing that her body can be restored, that the cancer cells can be destroyed, and that she can live to see her grandchildren grow up.

Please pray for complete healing, for strength during treatment, for peace for our family, and for the medical team to have wisdom in her care.`,
    recitablePrayer: `Heavenly Father, we come before You today with heavy hearts but unwavering faith. We lift up this precious mother who is fighting cancer with courage and grace.

Lord, You are the Great Physician. You formed her body in her mother's womb, and You know every cell, every molecule, every fiber of her being. We ask that You would touch her now with Your healing hand.

We pray against every cancer cell in her body. We command them to die and be expelled in the mighty name of Jesus. We speak life and health over her bones, her blood, her organs, and her lymphatic system.

Give her strength, Lord, for the days of treatment. When she feels weak, be her strength. When she feels afraid, be her peace. When she feels alone, remind her of the thousands of people lifting her up in prayer.

We thank You in advance for the healing we believe is coming. We trust in Your perfect timing and Your perfect plan. May this trial become a testimony of Your goodness and power.

In Jesus' name we pray, Amen.`,
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
    recitablePrayer: `Lord of love and restoration, we bring before You a marriage in crisis. You who joined this couple together, we ask that You would heal what has been broken.

Soften their hearts toward one another. Remove the walls of resentment brick by brick. Replace bitterness with compassion, silence with honest communication, and distance with intimacy.

We pray for the husband seeking reconciliation. Give him wisdom, patience, and humility. Help him become the man You created him to be. Let his changed heart speak louder than any words.

We pray for the wife who has been hurt. Heal her wounds, Lord. Protect her heart but don't let it harden. Open her eyes to see genuine change when it comes.

Most of all, we pray for the children caught in the middle. Surround them with Your peace that passes understanding. Let them know they are loved by both parents and by You.

Father, we believe in the power of redemption. What seems impossible to man is possible with You. Restore this family. Let their testimony bring hope to others walking through similar valleys.

We pray with faith, believing in Your power to restore. Amen.`,
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
    recitablePrayer: `Provider God, we lift up this faithful worker who is seeking employment. You know the weight he carries, the sleepless nights, the anxiety about providing for his family.

Lord, You are the God who provides. You fed Elijah by ravens. You multiplied loaves and fishes. You own the cattle on a thousand hills. We trust that You can open doors that no man can shut.

We pray specifically for the interview on Tuesday. Give him favor in the eyes of the hiring managers. Let his skills and experience shine. Calm his nerves and sharpen his mind. Let his words be clear and his presence be confident.

If this is the right job, Lord, let it be confirmed in unmistakable ways. Let every obstacle be removed and every competing candidate fall away. But if You have something better in mind, give him peace to trust Your timing.

We pray for his family during this waiting season. Give his wife strength and patience. Let the children feel secure despite the uncertainty. Provide for their needs day by day, just as You promised.

We thank You that breakthrough is coming. We praise You in advance for the testimony that will emerge from this trial. You are faithful, and we trust You completely.

In Jesus' mighty name, Amen.`,
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
    recitablePrayer: `God of all nations, we cry out to You for peace in the Middle East. The violence has gone on too long. Too much blood has been spilled. Too many lives have been lost.

We pray for the innocent civilians caught in the crossfire. Protect them, Lord. Be a shield around the children, the elderly, the vulnerable. Provide food, water, and shelter for those who have lost everything.

We pray for the leaders on all sides. Soften their hearts. Open their minds to the possibility of peace. Give them courage to choose dialogue over destruction, even when it is politically difficult.

We pray for the families who have lost loved ones. Comfort them in their grief. Do not let their sorrow turn to hatred. Plant seeds of reconciliation even in the soil of tragedy.

We pray for the peacemakers on the ground. Protect aid workers, journalists, and negotiators who risk their lives for others. Multiply their efforts and amplify their voices.

Lord, we know that true peace can only come from You. We ask for Your kingdom to come, Your will to be done, in this troubled region as it is in heaven. We pray for the day when children can play without fear and families can sleep in safety.

Until that day comes, give us endurance to keep praying, compassion to keep caring, and faith to believe that peace is possible.

In the name of the Prince of Peace, Jesus Christ, Amen.`,
    author: 'Grace Community',
    count: 15420,
    goal: 20000,
    topic: 'World Peace',
  }
];

export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    // Check if we already have prayers
    const existing = await db.select().from(prayers).limit(1);
    if (existing.length > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }

    // Insert seed data
    await db.insert(prayers).values(SEED_PRAYERS);
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
