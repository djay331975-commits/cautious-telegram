import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: 'demo@autostream.com' },
    update: {},
    create: {
      email: 'demo@autostream.com',
      name: 'Demo User',
    },
  });

  // Create EcoStream Home store
  const store = await prisma.store.upsert({
    where: { id: 'ecostream-home-id' },
    update: {},
    create: {
      id: 'ecostream-home-id',
      name: 'EcoStream Home',
      platform: 'Shopify',
      accessToken: 'shpat_mock_token',
      userId: user.id,
    },
  });

  // Seed Niches
  const niches = [
    { name: 'Sustainable Living', category: 'Household', growthScore: 92, profitabilityIndex: 8.5, competitionLevel: 'MEDIUM' },
    { name: 'Home Office', category: 'Furniture', growthScore: 88, profitabilityIndex: 7.2, competitionLevel: 'HIGH' },
    { name: 'Pet Care', category: 'Animals', growthScore: 75, profitabilityIndex: 6.8, competitionLevel: 'LOW' },
    { name: 'Fitness & Wellness', category: 'Health', growthScore: 95, profitabilityIndex: 9.1, competitionLevel: 'MEDIUM' },
  ];

  for (const n of niches) {
    await prisma.niche.upsert({
      where: { name: n.name },
      update: n,
      create: n,
    });
  }

  const sustainableNiche = await prisma.niche.findUnique({ where: { name: 'Sustainable Living' } });

  // Seed Trending Products
  if (sustainableNiche) {
    const trendingProducts = [
      {
        title: 'Reusable Beeswax Wraps',
        nicheId: sustainableNiche.id,
        discoveryPlatform: 'TikTok',
        currentMarketPrice: 14.99,
        estimatedMonthlySales: 1200,
        signalStrength: 0.92,
        status: 'SOURCED'
      },
      {
        title: 'Bamboo Toothbrushes',
        nicheId: sustainableNiche.id,
        discoveryPlatform: 'Amazon',
        currentMarketPrice: 9.99,
        estimatedMonthlySales: 3500,
        signalStrength: 0.85,
        status: 'APPROVED'
      }
    ];

    for (const tp of trendingProducts) {
      await prisma.trendingProduct.create({
        data: tp
      });
    }
  }

  const products = [
    {
      externalId: 'sp_1',
      title: 'Plant-Based Kitchen Sponges (12 Count)',
      price: 9.99,
      listingTitle: 'EcoStream Home Plant-Based Kitchen Sponges - 12 Pack - 100% Biodegradable & Compostable - Eco-Friendly Scrubbing Sponges for Dishes & Surfaces',
      listingDescription: 'Upgrade your kitchen cleaning routine with EcoStream Home Plant-Based Kitchen Sponges. Our sponges are made from 100% natural, plant-based materials, making them completely biodegradable and compostable.',
      bulletPoints: '100% PLANT-BASED|BIODEGRADABLE & COMPOSTABLE|DURABLE & SCRATCH-FREE|NON-TOXIC & ODOR-RESISTANT|ECO-FRIENDLY PACKAGING',
    },
    // ... adding a few more for the seed
    {
      externalId: 'sp_5',
      title: 'Reusable Beeswax Food Wraps (9 Pack)',
      price: 13.99,
      listingTitle: 'EcoStream Home Reusable Beeswax Food Wraps - 9 Pack Multi-Size Set - Sustainable Plastic-Free Food Storage - Organic Cotton & Beeswax',
      listingDescription: 'The natural alternative to plastic wrap. Our beeswax wraps are made from organic cotton, sustainably harvested beeswax, jojoba oil, and tree resin.',
      bulletPoints: '9-PACK VARIETY SET|100% NATURAL MATERIALS|REUSABLE & WASHABLE|BIODEGRADABLE STORAGE|KEEPS FOOD FRESHER LONGER',
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `prod_${p.externalId}` },
      update: {
        price: p.price,
        listingTitle: p.listingTitle,
        listingDescription: p.listingDescription,
        bulletPoints: p.bulletPoints,
      },
      create: {
        id: `prod_${p.externalId}`,
        ...p,
        storeId: store.id,
      },
    });
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
