import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'file:/home/team/.data/agent-team-1a604bf3.db' } }
});

const PHASE4_NICHES = [
  {
    name: 'Smart Tech Home',
    category: 'electronics',
    growthScore: 85.5,
    profitabilityIndex: 78.2,
    competitionLevel: 'Medium',
    config: {
      fulfillmentPartner: 'CJ',
      shippingOrigin: 'US',
      defaultMarkupPercent: 35.0,
      preferredWarehouse: 'US',
      maxShippingDays: 10,
      cjCategoryId: 'electronics',
      listingPromptPrefix: 'Modern workspace ergonomics, remote worker focus, tech-forward minimalist',
      listingPlatform: 'Shopify',
    }
  },
  {
    name: 'Zen Den',
    category: 'wellness',
    growthScore: 72.3,
    profitabilityIndex: 81.0,
    competitionLevel: 'Low',
    config: {
      fulfillmentPartner: 'Printful',
      shippingOrigin: 'US',
      defaultMarkupPercent: 40.0,
      preferredWarehouse: 'US',
      maxShippingDays: 12,
      cjCategoryId: 'home-garden',
      listingPromptPrefix: 'High-end wellness, mindfulness aesthetic, spa-like tranquility',
      listingPlatform: 'Shopify',
    }
  },
  {
    name: 'Urban Homestead',
    category: 'sustainability',
    growthScore: 68.7,
    profitabilityIndex: 74.5,
    competitionLevel: 'Medium',
    config: {
      fulfillmentPartner: 'CJ',
      shippingOrigin: 'US',
      defaultMarkupPercent: 30.0,
      preferredWarehouse: 'US',
      maxShippingDays: 14,
      cjCategoryId: 'home-garden',
      listingPromptPrefix: 'Urban sustainability, food independence, apartment-friendly gardening',
      listingPlatform: 'Shopify',
    }
  }
];

async function main() {
  console.log('Seeding Phase 4 niches...\n');

  for (const nicheData of PHASE4_NICHES) {
    const { config, ...nicheFields } = nicheData;

    // Upsert niche
    const niche = await prisma.niche.upsert({
      where: { name: nicheFields.name },
      create: nicheFields,
      update: nicheFields,
    });
    console.log(`✅ Niche: "${niche.name}" (${niche.id})`);

    // Upsert niche config
    const nicheConfig = await prisma.nicheConfig.upsert({
      where: { nicheId: niche.id },
      create: { ...config, nicheId: niche.id },
      update: config,
    });
    console.log(`   Config: ${nicheConfig.fulfillmentPartner} | ${nicheConfig.defaultMarkupPercent}% markup | ${nicheConfig.maxShippingDays} days max`);

    // Link to the existing EcoStream Home store
    const store = await prisma.store.findFirst({ where: { name: 'EcoStream Home' } });
    if (store) {
      await prisma.storeNiche.upsert({
        where: { storeId_nicheId: { storeId: store.id, nicheId: niche.id } },
        create: { storeId: store.id, nicheId: niche.id },
        update: {},
      });
      console.log(`   Linked to store: "${store.name}"`);
    }

    console.log('');
  }

  console.log('Phase 4 niche seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
