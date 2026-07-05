import fs from 'fs';
import { CJAdapter } from '../src/fulfillment/cj-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function betterMain() {
    const catalogPath = '/home/team/shared/final_expansion_catalog.md';
    if (!fs.existsSync(catalogPath)) {
        console.error(`Catalog not found at ${catalogPath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(catalogPath, 'utf-8');

    // Extract Product ID and Name from the catalog
    const productRegex = /\| \*\*(CJ-([A-Z]+)-\d+)\*\* \| ([^|]+) \|/g;
    const items: { targetId: string, prefix: string, name: string }[] = [];
    let match;

    while ((match = productRegex.exec(content)) !== null) {
        items.push({
            targetId: match[1],
            prefix: match[2],
            name: match[3].trim()
        });
    }

    console.log(`Found ${items.length} products in catalog.`);

    const cjEmail = process.env.CJ_EMAIL;
    const cjApiKey = process.env.CJ_API_KEY;

    if (!cjEmail || !cjApiKey) {
        console.error('CJ_EMAIL and CJ_API_KEY environment variables are required.');
        console.warn('Proceeding with dry-run mode (no API calls).');
    }

    const cj = new CJAdapter();
    if (cjEmail && cjApiKey) {
        await cj.authenticate(cjEmail, cjApiKey);
    }

    const nicheMap: Record<string, string> = {
        'PET': 'Pet Care',
        'WELL': 'Wellness & Self-Care',
        'ECO': 'Sustainable Living'
    };

    for (const item of items) {
        console.log(`\nProcessing ${item.targetId}: ${item.name}`);
        const nicheName = nicheMap[item.prefix] || 'General';
        
        let niche = await prisma.niche.findUnique({ where: { name: nicheName } });
        if (!niche) {
            console.log(`Niche ${nicheName} not found, creating...`);
            niche = await prisma.niche.create({ data: { name: nicheName, category: item.prefix } });
        }

        if (!cjEmail || !cjApiKey) {
            console.log(`[DRY-RUN] Would search for "${item.name}" in niche "${nicheName}"`);
            continue;
        }

        try {
            const searchResults = await cj.listProducts({ productName: item.name, pageSize: 10 });
            
            if (!searchResults.result || !searchResults.data || !searchResults.data.list || searchResults.data.list.length === 0) {
                console.warn(`No results found for ${item.name}`);
                continue;
            }

            // Refined Matching Logic:
            // 1. Initial candidates: Top 5 by listing count
            const candidates = searchResults.data.list
                .sort((a: any, b: any) => (b.numListed || 0) - (a.numListed || 0))
                .slice(0, 5);
            
            let bestMatch = candidates[0];
            let bestShippingDays = 999;
            let bestMatchSku = bestMatch.productSku;

            console.log(`Checking shipping times for top ${candidates.length} candidates...`);

            for (const candidate of candidates) {
                try {
                    // Check freight to US as primary target
                    const freight = await cj.getFreight({
                        pid: candidate.pid,
                        endCountryCode: 'US',
                        quantity: 1
                    });

                    if (freight.result && freight.data && freight.data.length > 0) {
                        // Find the fastest shipping method for this candidate
                        // CJ freight response data is an array of logistic methods
                        const methods = freight.data.map((m: any) => {
                            // shippingTime is usually like "3-7" or "7-15"
                            const timeParts = m.shippingTime.split('-');
                            const maxDays = parseInt(timeParts[timeParts.length - 1]);
                            return { ...m, maxDays };
                        }).sort((a: any, b: any) => a.maxDays - b.maxDays);

                        const fastest = methods[0];
                        console.log(`  - Candidate PID ${candidate.pid}: Fastest shipping is ${fastest.shippingTime} days via ${fastest.logisticName}`);

                        if (fastest.maxDays < bestShippingDays) {
                            bestShippingDays = fastest.maxDays;
                            bestMatch = candidate;
                            
                            // Get details for the best candidate to get a concrete variant SKU
                            const details = await cj.getProductDetails(candidate.pid);
                            bestMatchSku = details.data?.variants?.[0]?.variantSku || candidate.productSku;
                        }
                    }
                } catch (err) {
                    console.warn(`  - Error fetching freight for PID ${candidate.pid}:`, (err as any).message);
                }
            }

            console.log(`Winner for ${item.name}: ${bestMatch.productName} (PID: ${bestMatch.pid}, Est. Max Shipping: ${bestShippingDays} days)`);

            // Store in database
            await prisma.trendingProduct.upsert({
                where: { id: `cj-${bestMatch.pid}` }, // Using a pseudo-id or we should let prisma generate one
                create: {
                    title: item.name,
                    nicheId: niche.id,
                    discoveryPlatform: 'CJ',
                    externalUrl: `https://app.cjdropshipping.com/product-detail.html?id=${bestMatch.pid}`,
                    currentMarketPrice: parseFloat(bestMatch.productPrice || '0'),
                    signalStrength: 1.0,
                    status: 'SOURCED',
                    keywords: `pid:${bestMatch.pid}|sku:${bestMatchSku}|targetId:${item.targetId}|shipping:${bestShippingDays}`
                },
                update: {
                    status: 'SOURCED',
                    keywords: `pid:${bestMatch.pid}|sku:${bestMatchSku}|targetId:${item.targetId}|shipping:${bestShippingDays}`
                }
            });

        } catch (error) {
            console.error(`Error mapping ${item.name}:`, error);
        }
    }
}

betterMain().catch(console.error).finally(() => prisma.$disconnect());
