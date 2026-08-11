import fs from 'fs';
import { CJAdapter } from '../src/fulfillment/cj-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function similarity(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const bWords = b.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const common = aWords.filter(w => bWords.includes(w));
  return common.length / Math.max(aWords.length, bWords.length);
}

async function main() {
  const cjApiKey = process.env.CJ_API_KEY;
  if (!cjApiKey || !cjApiKey.includes('@api@')) {
    console.error('CJ_API_KEY must be set to the combined format (CJUserNum@api@KEY)');
    process.exit(1);
  }

  const cj = new CJAdapter();
  await cj.authenticate('', cjApiKey);
  console.log('✅ CJ Authenticated successfully\n');

  // Phase 3: PID Mapping from final_expansion_catalog.md
  const catalogPath = '/home/team/shared/final_expansion_catalog.md';
  if (!fs.existsSync(catalogPath)) {
    console.error(`Catalog not found at ${catalogPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(catalogPath, 'utf-8');
  const productRegex = /\| \*\*(CJ-([A-Z]+)-\d+)\*\* \| ([^|]+) \|/g;
  const items: { targetId: string; prefix: string; name: string }[] = [];
  let match;

  while ((match = productRegex.exec(content)) !== null) {
    items.push({
      targetId: match[1],
      prefix: match[2],
      name: match[3].trim()
    });
  }

  console.log(`Found ${items.length} Phase 3 products in catalog.\n`);

  const nicheMap: Record<string, string> = {
    'PET': 'Pet Care',
    'WELL': 'Wellness & Self-Care',
    'ECO': 'Sustainable Living'
  };

  const phase3Results: any[] = [];

  for (const item of items) {
    console.log(`\n=== ${item.targetId}: ${item.name} ===`);
    
    const nicheName = nicheMap[item.prefix] || 'General';
    let niche = await prisma.niche.findUnique({ where: { name: nicheName } });
    if (!niche) {
      console.log(`Creating niche: ${nicheName}`);
      niche = await prisma.niche.create({ data: { name: nicheName, category: item.prefix } });
    }

    // Search CJ for this product
    try {
      const searchResults = await cj.listProducts({ productName: item.name, pageSize: 10 });
      await sleep(1100); // 1.1s delay to respect 1 QPS

      if (!searchResults.result || !searchResults.data?.list?.length) {
        console.warn(`  ⚠️ No results found for "${item.name}"`);
        phase3Results.push({ targetId: item.targetId, name: item.name, status: 'NOT_FOUND', pid: null });
        continue;
      }

      // Score results by listing count + name similarity
      const scored = searchResults.data.list.map((p: any) => ({
        ...p,
        score: (p.listingCount || 0) * 0.3 + similarity(item.name, p.productNameEn || '') * 100
      })).sort((a: any, b: any) => b.score - a.score);

      const best = scored[0];
      const bestScore = Math.round(best.score);
      const bestName = best.productNameEn || best.productName || 'Unknown';

      console.log(`  Found ${searchResults.data.total} results. Best match:`);
      console.log(`  PID: ${best.pid}`);
      console.log(`  Name: ${bestName.slice(0, 100)}`);
      console.log(`  Price: $${best.sellPrice || 'N/A'}`);
      console.log(`  Score: ${bestScore}`);

      // Store in database
      try {
        await prisma.trendingProduct.upsert({
          where: { id: `cj-${best.pid}` },
          create: {
            title: item.name,
            nicheId: niche.id,
            discoveryPlatform: 'CJ',
            externalUrl: `https://app.cjdropshipping.com/product-detail.html?id=${best.pid}`,
            currentMarketPrice: parseFloat(best.sellPrice || '0'),
            signalStrength: Math.min(1, bestScore / 100),
            status: 'SOURCED',
            keywords: `pid:${best.pid}|sku:${best.productSku || ''}|targetId:${item.targetId}`
          },
          update: {
            status: 'SOURCED',
            keywords: `pid:${best.pid}|sku:${best.productSku || ''}|targetId:${item.targetId}`
          }
        });
        console.log(`  ✅ Saved to database (trendingProduct: cj-${best.pid})`);
      } catch (dbErr) {
        console.error(`  ❌ Database error: ${dbErr}`);
      }

      phase3Results.push({
        targetId: item.targetId,
        name: item.name,
        status: 'MAPPED',
        pid: best.pid,
        cjName: bestName.slice(0, 100),
        price: best.sellPrice,
        score: bestScore
      });

    } catch (err: any) {
      console.error(`  ❌ Error: ${err.message}`);
      if (err.response?.status === 429) {
        console.warn('  Rate limited. Waiting 5s then retrying...');
        await sleep(5000);
        // Retry logic for the current item
      }
      phase3Results.push({ targetId: item.targetId, name: item.name, status: 'ERROR', error: err.message });
    }
  }

  // Phase 4: Batch verification from product listing files
  console.log('\n\n========================================');
  console.log('PHASE 4: BATCH VERIFICATION');
  console.log('========================================');

  const phase4ListingFiles = [
    { file: '/home/team/shared/content/phase4_smart_tech_listings.md', niche: 'Smart Tech Home' },
    { file: '/home/team/shared/content/phase4_zen_den_listings.md', niche: 'Zen Den' },
    { file: '/home/team/shared/content/phase4_urban_homestead_listings.md', niche: 'Urban Homestead' },
  ];

  const phase4Results: any[] = [];

  for (const { file, niche } of phase4ListingFiles) {
    console.log(`\n--- ${niche} ---`);
    
    if (!fs.existsSync(file)) {
      console.warn(`  File not found: ${file}`);
      continue;
    }

    const fileContent = fs.readFileSync(file, 'utf-8');
    // Extract product names from markdown tables
    // Looking for product names in first data column after headers
    const lines = fileContent.split('\n');
    let inTable = false;
    let productNames: string[] = [];

    for (const line of lines) {
      if (line.includes('| ---')) { inTable = true; continue; }
      if (inTable && line.trim().startsWith('|')) {
        const cols = line.split('|').map(c => c.trim()).filter(c => c);
        // Product name is typically the second column (after #)
        if (cols.length >= 2) {
          const name = cols[1].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
          if (name && name.length > 3 && !name.includes('Product') && !name.includes(':')) {
            productNames.push(name);
          }
        }
      }
      // Reset when we hit a non-table line after a table
      if (inTable && !line.trim().startsWith('|') && line.trim() !== '') {
        inTable = false;
      }
    }

    // Also try parsing from hero product listings
    const heroMatch = fileContent.match(/\*\*([^*]+?)\*\*\s*[–-]+\s*\$\d/);
    if (heroMatch) {
      const hero = heroMatch[1].trim().replace(/\*+/g, '');
      if (!productNames.includes(hero)) {
        productNames.unshift(hero);
      }
    }

    // If we didn't get enough from parsing, try the phase4 verification doc
    if (productNames.length < 5) {
      // Fall back to the phase4_supplier_verification.md which has the product list
      const phase4Doc = '/home/team/shared/phase4_supplier_verification.md';
      if (fs.existsSync(phase4Doc)) {
        const docContent = fs.readFileSync(phase4Doc, 'utf-8');
        const sectionMatch = docContent.match(new RegExp(`### ${niche}[\\s\\S]*?(?=###|$)`));
        if (sectionMatch) {
          const pLines = sectionMatch[0].split('\n');
          for (const pl of pLines) {
            const m = pl.match(/\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*\$/);
            if (m) {
              const pName = m[1].trim();
              if (!productNames.includes(pName)) {
                productNames.push(pName);
              }
            }
          }
        }
      }
    }

    console.log(`  Found ${productNames.length} product names to verify`);

    for (const pName of productNames.slice(0, 10)) {
      console.log(`\n  Checking: "${pName}"`);
      try {
        const searchResults = await cj.listProducts({ productName: pName, pageSize: 5 });
        await sleep(1100);

        if (!searchResults.result || !searchResults.data?.list?.length) {
          console.warn(`    ⚠️ Not found on CJ`);
          phase4Results.push({ niche, name: pName, status: 'NOT_FOUND', pid: null });
          continue;
        }

        const scored = searchResults.data.list.map((p: any) => ({
          ...p,
          score: (p.listingCount || 0) * 0.3 + similarity(pName, p.productNameEn || '') * 100
        })).sort((a: any, b: any) => b.score - a.score);

        const best = scored[0];
        console.log(`    ✅ Found! PID: ${best.pid}`);
        console.log(`    Price: $${best.sellPrice || 'N/A'}`);
        console.log(`    Match Score: ${Math.round(best.score)}`);

        phase4Results.push({
          niche,
          name: pName,
          status: 'FOUND',
          pid: best.pid,
          cjName: (best.productNameEn || best.productName || '').slice(0, 80),
          price: best.sellPrice,
          score: Math.round(best.score)
        });
      } catch (err: any) {
        console.error(`    ❌ Error: ${err.message}`);
        if (err.response?.status === 429) {
          await sleep(5000);
        }
        phase4Results.push({ niche, name: pName, status: 'ERROR', error: err.message });
      }
    }
  }

  // Generate report
  console.log('\n\n========================================');
  console.log('GENERATING REPORT');
  console.log('========================================');

  const report = [
    '# CJ Dropshipping Verification Results',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '---',
    '',
    '## Phase 3: PID Mapping (26 products)',
    '',
    '| Target ID | Product Name | Status | CJ PID | CJ Price | Match Score |',
    '|:---------|:------------|:-----:|:------:|:--------:|:----------:|',
  ];

  for (const r of phase3Results) {
    report.push(`| ${r.targetId} | ${r.name} | ${r.status === 'MAPPED' ? '✅' : '❌'} ${r.status} | ${r.pid || '—'} | ${r.price ? '$' + r.price : '—'} | ${r.score || '—'} |`);
  }

  report.push('', '---', '', '## Phase 4: Batch Verification (30 products)', '', '| Niche | Product Name | Status | CJ PID | CJ Price | Match Score |');

  for (const r of phase4Results) {
    report.push(`| ${r.niche} | ${r.name} | ${r.status === 'FOUND' ? '✅' : r.status === 'NOT_FOUND' ? '⚠️' : '❌'} ${r.status} | ${r.pid || '—'} | ${r.price ? '$' + r.price : '—'} | ${r.score || '—'} |`);
  }

  // Summary
  const phase3Mapped = phase3Results.filter(r => r.status === 'MAPPED').length;
  const phase4Found = phase4Results.filter(r => r.status === 'FOUND').length;

  report.push('', '---', '', '## Summary', '', `| Phase | Products | Found/Mapped | Success Rate |`, `|:-----|:--------:|:----------:|:----------:|`);
  report.push(`| Phase 3 PID Mapping | ${phase3Results.length} | ${phase3Mapped} | ${phase3Results.length > 0 ? Math.round(phase3Mapped / phase3Results.length * 100) : 0}% |`);
  report.push(`| Phase 4 Batch Verify | ${phase4Results.length} | ${phase4Found} | ${phase4Results.length > 0 ? Math.round(phase4Found / phase4Results.length * 100) : 0}% |`);

  const reportContent = report.join('\n');
  fs.writeFileSync('/home/team/shared/cj_verification_results.md', reportContent);
  console.log('\n✅ Report saved to /home/team/shared/cj_verification_results.md');
  console.log(`\nPhase 3: ${phase3Mapped}/${phase3Results.length} mapped`);
  console.log(`Phase 4: ${phase4Found}/${phase4Results.length} found`);
}

main().catch(console.error).finally(() => prisma.$disconnect());