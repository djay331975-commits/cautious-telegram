#!/usr/bin/env python3
"""Bulk-list all 20 Phase 5 electronics products on Shopify. No images (CJ API disabled)."""

import os, json, time, urllib.request, urllib.error

TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
BASE = "https://wnun0z-h9.myshopify.com/admin/api/2024-01"

PRODUCTS = [
    # Category 1: Phone Accessories
    ("CarPlay Wireless Adapter", "Electronics", "PH5-PH-001", "59.99",
     "<h2>Turn Your Car's Screen Wireless in Seconds</h2><p>Transform your wired CarPlay into a seamless wireless experience. No more tangled cables — just plug in the adapter and connect your iPhone automatically within 5 seconds of starting your car.</p><h3>Why You Need This</h3><ul><li><strong>Instant Auto-Connect:</strong> Pairs automatically when you start the engine — no buttons, no waiting.</li><li><strong>5.8GHz Low Latency:</strong> Crystal-clear audio and zero lag for navigation, calls, and music.</li><li><strong>Universal Fit:</strong> Works with 98% of factory CarPlay systems — BMW, Mercedes, Ford, Honda, Toyota, and more.</li><li><strong>Compact & Hidden:</strong> The size of a USB stick — tucks neatly into your center console.</li></ul><p>Say goodbye to plugging and unplugging your phone every time you drive. This little adapter transforms your daily commute.</p>",
     "Phone Accessories"),
    ("MagSafe 3-in-1 Charging Station", "Electronics", "PH5-PH-002", "44.99",
     "<h2>One Dock. Three Devices. Zero Clutter.</h2><p>Charge your iPhone, Apple Watch, and AirPods simultaneously with this elegant foldable MagSafe charging station. Perfect for your nightstand, desk, or travel bag.</p><h3>What Makes It Special</h3><ul><li><strong>True 15W MagSafe:</strong> Snaps magnetically and charges at full speed — no cheap imitation magnets.</li><li><strong>Foldable Design:</strong> Collapses flat to the size of a wallet — perfect for business trips.</li><li><strong>Nightstand Mode:</strong> Apple Watch charges upright so you can use the clock display at night.</li><li><strong>Premium Aluminum Build:</strong> Weighted base, anti-slip silicone, and soft LED indicator.</li></ul><p>One cable powers everything. Clean up your bedside table and never hunt for chargers again.</p>",
     "Phone Accessories"),
    ("Phone Lens Kit Pro", "Electronics", "PH5-PH-003", "34.99",
     "<h2>Turn Your Phone Into a Pro Camera</h2><p>Clip-on lens kit with macro, wide-angle, and fisheye lenses that instantly upgrade your phone photography. No apps, no settings — just clip and shoot.</p><h3>Three Lenses, Endless Possibilities</h3><ul><li><strong>20x Macro:</strong> Capture flower petals, insect eyes, and textile details in stunning clarity.</li><li><strong>0.45x Wide Angle:</strong> Fit the whole group, the full landscape, or your entire room in one shot.</li><li><strong>198° Fisheye:</strong> Creative circular shots that stand out on Instagram and TikTok.</li><li><strong>Universal Clip:</strong> Fits all phones — iPhone, Samsung Galaxy, Google Pixel — even with cases on.</li></ul><p>Glass lenses, not plastic. Aluminum housing, not cheap alloy. This is a serious tool for content creators who want pro results without a DSLR.</p>",
     "Phone Accessories"),
    ("Cable Organizer Bag", "Electronics", "PH5-PH-004", "19.99",
     "<h2>Your Portable Tech Command Center</h2><p>Never dig through your bag for a charger again. This double-layer travel organizer stores every cable, adapter, and gadget you carry — and slips into any backpack or suitcase.</p><h3>Engineered for Chaos</h3><ul><li><strong>Dual-Layer Design:</strong> Top mesh pockets for cables, bottom elastic loops for power banks and adapters.</li><li><strong>Shockproof Shell:</strong> Hard EVA exterior protects your gear from drops, spills, and crushing.</li><li><strong>20+ Compartments:</strong> Customizable dividers — configure it for your exact loadout.</li><li><strong>Water-Resistant Zippers:</strong> Rain, coffee spills, bathroom counters — your electronics stay dry.</li></ul><p>If you carry more than two cables in your bag, this organizer will change your life.</p>",
     "Phone Accessories"),
    # Category 2: Automotive Tech
    ("Dual Dash Cam 4K", "Electronics", "PH5-AU-001", "89.99",
     "<h2>The Witness That Never Blinks</h2><p>Front and rear 4K dash camera with 170° wide-angle lens captures every detail — license plates, road signs, and what happened behind you. Your silent guardian on every drive.</p><h3>Protection When You Need It Most</h3><ul><li><strong>True 4K + 1080p Dual:</strong> Front camera records in crisp 4K while the rear captures in Full HD simultaneously.</li><li><strong>Sony STARVIS Sensor:</strong> Exceptional night vision — clear footage even in parking lots at midnight.</li><li><strong>24/7 Parking Mode:</strong> Motion detection and time-lapse recording protect your car when you're not there.</li><li><strong>Built-in GPS & Wi-Fi:</strong> Stamps speed, route, and location — instantly save and share clips to your phone.</li></ul><p>Insurance disputes, parking hit-and-runs, road rage incidents — this camera pays for itself the first time you need it.</p>",
     "Automotive Tech"),
    ("Car Vacuum Cleaner", "Electronics", "PH5-AU-002", "39.99",
     "<h2>Professional-Grade Clean, Anywhere</h2><p>This isn't a weak handheld vacuum that dies after three crumbs. 8000Pa of suction in a cordless, portable design that fits in your glove box.</p><h3>Powerful Enough for Real Messes</h3><ul><li><strong>8000Pa Strong Suction:</strong> Pet hair, sand, cereal, glitter — it all disappears in seconds.</li><li><strong>HEPA Filtration:</strong> Traps 99.97% of dust and allergens — exhausts clean air, not dust clouds.</li><li><strong>3 Attachments:</strong> Crevice tool for tight gaps, brush for upholstery, and wide nozzle for floor mats.</li><li><strong>USB-C Rechargeable:</strong> 30 minutes of runtime on a full charge. Charges in any car USB port.</li></ul><p>Use it in your car, RV, boat, or even for quick kitchen crumbs. Clean wherever life happens.</p>",
     "Automotive Tech"),
    ("Wireless Car Charger Mount", "Electronics", "PH5-AU-003", "29.99",
     "<h2>Snap, Charge, Drive</h2><p>A phone mount that automatically clamps your phone and starts wireless charging the moment you place it. No plugs, no cables, no distracted fumbling.</p><h3>Smart From the Moment You Get In</h3><ul><li><strong>Auto-Clamping Arms:</strong> Infrared sensor detects your phone, closes gently, and locks securely.</li><li><strong>15W Fast Wireless Charging:</strong> Compatible with iPhone MagSafe and all Qi Android phones.</li><li><strong>360° Rotation:</strong> One-hand adjustment between portrait, landscape, or any angle in between.</li><li><strong>Dashboard + Vent Mount:</strong> Includes both — stick it to your dash or clip it to an air vent.</li></ul><p>Perfect for Uber and delivery drivers who need their phone visible, charged, and instantly accessible.</p>",
     "Automotive Tech"),
    ("Smart Tire Pressure Monitor", "Electronics", "PH5-AU-004", "49.99",
     "<h2>Know Your Tires Before They Fail</h2><p>Solar-powered wireless TPMS that monitors all four tires in real time — pressure, temperature, and slow leaks — displayed on a bright LCD screen on your dashboard.</p><h3>Prevent Blowouts Before They Happen</h3><ul><li><strong>Real-Time 4-Tire Monitoring:</strong> Each tire's pressure and temperature displayed simultaneously.</li><li><strong>Solar + USB-C Dual Power:</strong> Runs indefinitely on daylight. USB backup for cloudy weeks.</li><li><strong>Auto-Alert:</strong> Loud alarm + flashing display when pressure drops 25% or temperature spikes unsafe.</li><li><strong>5-Minute DIY Install:</strong> Screw sensors onto valve stems, place display on dash — done.</li></ul><p>Properly inflated tires save 3-5% on fuel, last 30% longer, and keep your family safe. This monitor makes it effortless.</p>",
     "Automotive Tech"),
    # Category 3: Fitness Tech
    ("Mini Massage Gun Pro", "Electronics", "PH5-FT-001", "49.99",
     "<h2>Professional Muscle Recovery — Pocket-Sized</h2><p>The same deep-tissue percussion therapy used by pro athletes, now in a device that fits in your palm. 3200 RPM with 6 interchangeable heads for every muscle group.</p><h3>Recover Faster. Move Better.</h3><ul><li><strong>3200 RPM Percussion:</strong> Penetrates 12mm deep into muscle tissue — relieves knots, lactic acid, and post-workout soreness.</li><li><strong>6 Massage Heads:</strong> Ball for large muscles, bullet for trigger points, flat for back, fork for spine, shovel for shoulders, and cushion for sensitive areas.</li><li><strong>Ultra-Quiet: 42dB:</strong> Quieter than a library whisper — use it in the office, gym, or while watching TV.</li><li><strong>10-Hour Battery:</strong> USB-C rechargeable with battery indicator. Take it anywhere for a week without charging.</li></ul><p>Whether you're a marathon runner, CrossFit enthusiast, or just tired of neck pain from desk work — this massage gun delivers relief the moment you turn it on.</p>",
     "Fitness Tech"),
    ("Smart Jump Rope", "Electronics", "PH5-FT-002", "24.99",
     "<h2>The Rope That Counts For You</h2><p>A cordless jump rope with a digital display that tracks every jump, calorie burned, and timer session. Get a full cardio workout in your living room without tripping over a real rope.</p><h3>Smart Exercise Made Simple</h3><ul><li><strong>Digital Triple Display:</strong> Jump count, calories burned, and session timer — all visible as you exercise.</li><li><strong>Cordless Design:</strong> Weighted ball bearings simulate real rope resistance without the tripping hazard.</li><li><strong>Adjustable Rope Length:</strong> Ball-bearing tangle-free rope mode also included for traditional jumpers.</li><li><strong>Memory Function:</strong> Saves your last workout stats — track your progress week over week.</li></ul><p>Perfect for apartment dwellers, travelers, and anyone who wants a high-intensity cardio workout without leaving home.</p>",
     "Fitness Tech"),
    ("Smart Posture Corrector", "Electronics", "PH5-FT-003", "34.99",
     "<h2>Your Personal Posture Coach — Wearable & Smart</h2><p>A lightweight device worn between your shoulder blades that vibrates gently whenever you slouch. Train yourself to sit and stand tall in just 14 days.</p><h3>Train Your Body Like a Habit</h3><ul><li><strong>Precision Angle Sensor:</strong> Calibrates to your ideal posture and vibrates when you deviate beyond 5 degrees.</li><li><strong>App-Powered Training:</strong> Bluetooth connects to your phone for guided posture exercises and progress tracking.</li><li><strong>12-Hour Battery Life:</strong> Wear it all day at work, then recharge via USB in 90 minutes.</li><li><strong>Invisible Under Clothes:</strong> Ultra-thin 6mm profile — no one knows you're wearing it.</li></ul><p>Neck pain, shoulder tension, and \"tech neck\" are reversible. This device makes good posture automatic.</p>",
     "Fitness Tech"),
    # Category 4: Kitchen Electronics
    ("Smart Milk Frother", "Electronics", "PH5-KT-001", "39.99",
     "<h2>Barista-Grade Foam, Your Kitchen, 30 Seconds</h2><p>Handheld electric milk frother that creates rich, velvety microfoam — hot or cold — in the same cup you drink from. A coffee shop upgrade that pays for itself in a week.</p><h3>Four Modes, Infinite Drinks</h3><ul><li><strong>Hot Dense Foam:</strong> Thick, creamy cappuccino foam that holds peaks for latte art.</li><li><strong>Hot Light Foam:</strong> Silky microfoam for flat whites and cortados.</li><li><strong>Cold Foam:</strong> Refreshing iced latte foam — no ice melting, no dilution.</li><li><strong>Warm & Frothless:</strong> Just heats milk for hot chocolate and matcha.</li><li><strong>USB-C Rechargeable:</strong> Full charge lasts 2 weeks of daily lattes.</li></ul><p>Dishwasher-safe whisk, stainless steel body, and a stand that looks beautiful on your coffee station. Your morning latte habit just got an upgrade.</p>",
     "Kitchen Electronics"),
    ("Digital Kitchen Scale", "Electronics", "PH5-KT-002", "24.99",
     "<h2>Precision Meets Beautiful Design</h2><p>A bamboo-topped digital scale that measures down to 0.1g — perfect for pour-over coffee, baking, meal prep, and tracking macros with the companion app.</p><h3>Why This Is the Last Scale You'll Buy</h3><ul><li><strong>0.1g Precision up to 10kg:</strong> Weigh espresso doses and bulk flour with the same device.</li><li><strong>Bamboo + Stainless Steel:</strong> Looks stunning on your countertop — not like a lab instrument.</li><li><strong>Bluetooth App Sync:</strong> Automatically logs weights to your phone for nutrition tracking.</li><li><strong>USB-C Rechargeable:</strong> No more hunting for coin batteries. 6 months per charge.</li></ul><p>Water-resistant surface, touch-sensitive controls, and auto-tare for sequential ingredients. Baking bread just got more scientific.</p>",
     "Kitchen Electronics"),
    ("Rechargeable Salt & Pepper Grinder Set", "Electronics", "PH5-KT-003", "29.99",
     "<h2>Season With One Hand. No Twisting. No Batteries.</h2><p>Gravity-activated salt and pepper grinders that start grinding the moment you tilt them. Built-in LED illuminates your food, and the adjustable ceramic mechanism handles everything from fine dust to coarse flakes.</p><h3>Restaurant Style at Home</h3><ul><li><strong>Gravity Auto-Grind:</strong> Simply tilt — no buttons, no twisting, no effort. Try it once and you'll never go back.</li><li><strong>Adjustable Ceramic Mechanism:</strong> Dial in coarseness from powder-fine to rough-chunky.</li><li><strong>LED Light:</strong> Built-in light shows exactly where the seasoning lands on your steak or salad.</li><li><strong>USB-C Rechargeable:</strong> One charge lasts 3-6 months of daily cooking.</li></ul><p>These grinders are a conversation starter at dinner parties. Your guests will ask where you got them.</p>",
     "Kitchen Electronics"),
    # Category 5: Gaming
    ("Controller Charging Dock", "Electronics", "PH5-GM-001", "29.99",
     "<h2>Never See a Dead Controller Light Again</h2><p>A sleek dual charging dock for PS5 and PS4 controllers with LED charge indicators and 2-hour fast charge. Your controllers live here when you're not playing.</p><h3>Drop, Charge, Play</h3><ul><li><strong>Dual-Slot Design:</strong> Charge two controllers simultaneously — perfect for couch co-op nights.</li><li><strong>2-Hour Fast Charge:</strong> From empty to full in the time it takes to watch a movie.</li><li><strong>LED Status Lights:</strong> Red = charging, green = ready. Glance at your dock and know instantly.</li><li><strong>Overcharge Protection:</strong> Smart chip stops charging when full — preserves battery health for years.</li></ul><p>Snap-in design aligns perfectly every time. No misalignment, no waking up to a controller that didn't charge.</p>",
     "Gaming"),
    ("RGB Gaming Mouse Pad", "Electronics", "PH5-GM-002", "24.99",
     "<h2>90x40cm of Pure RGB Glory</h2><p>An XL extended mouse pad that covers your entire desk with 14 customizable lighting modes. Smooth micro-textured surface for precision tracking, waterproof coating, and anti-slip rubber base.</p><h3>Your Desk's Centerpiece</h3><ul><li><strong>14 RGB Modes:</strong> Breathing, wave, color cycle, static, and more — match your setup's aesthetic.</li><li><strong>XL 90x40cm Size:</strong> Keyboard and mouse both fit with room to spare. No more running off the edge mid-flick.</li><li><strong>Micro-Texture Surface:</strong> Optimized for both optical and laser sensors — consistent glide in every direction.</li><li><strong>Waterproof & Easy Clean:</strong> Spilled energy drink? Wipe it off. No stains, no peeling.</li></ul><p>USB-powered with an inline controller to cycle modes. This is the pad that makes your gaming setup Instagram-worthy.</p>",
     "Gaming"),
    ("Wireless Gaming Earbuds", "Electronics", "PH5-GM-003", "49.99",
     "<h2>Hear Footsteps Before They Hear You</h2><p>Ultra-low latency wireless earbuds designed specifically for gaming. 40ms lag (imperceptible), RGB charging case, and 35 hours of total battery life.</p><h3>Built for Competitive Play</h3><ul><li><strong>40ms Gaming Mode:</strong> Industry-leading low latency — footsteps, gunshots, and voice chat are perfectly synced.</li><li><strong>Dual Mics with ENC:</strong> Environmental noise cancellation isolates your voice from keyboard clicks and background noise.</li><li><strong>35-Hour Total Battery:</strong> 7 hours in the buds + 28 hours in the case. Game all weekend on a single charge.</li><li><strong>RGB Charging Case:</strong> Pulse lighting with remaining battery indicator built into the case.</li></ul><p>Bluetooth 5.3, IPX5 water resistance, and touch controls for volume, tracks, and game/music mode switching. These replace your bulky gaming headset.</p>",
     "Gaming"),
    # Category 6: Travel Tech
    ("Universal Travel Adapter", "Electronics", "PH5-TV-001", "39.99",
     "<h2>One Adapter. Every Country. All Your Devices.</h2><p>A GaN-powered universal travel adapter that works in 200+ countries with built-in 65W USB-C fast charging for your laptop, plus 3 additional USB ports for everything else.</p><h3>The Only Adapter You'll Pack</h3><ul><li><strong>200+ Countries:</strong> Retractable US, EU, UK, and AU plugs — slide and lock into place.</li><li><strong>65W GaN USB-C:</strong> Charges MacBook Pro, Dell XPS, and iPad Pro at full speed.</li><li><strong>3 Additional USB Ports:</strong> 2 USB-A + 1 USB-C — charge phone, watch, earbuds, and laptop simultaneously.</li><li><strong>Built-in Fuse + Surge Protection:</strong> 10A safety fuse protects your expensive devices from voltage spikes.</li></ul><p>Half the size of traditional adapters thanks to GaN technology. This replaces every charger you own when traveling.</p>",
     "Travel Tech"),
    ("Smart Luggage Tracker", "Electronics", "PH5-TV-002", "34.99",
     "<h2>Your Luggage Has a Voice Now</h2><p>A rechargeable Bluetooth tracker that works with Apple Find My and a global crowdsourced network. Know exactly where your suitcase is — at baggage claim, in transit, or at the hotel.</p><h3>Never Lose a Bag Again</h3><ul><li><strong>Apple Find My Compatible:</strong> Ping your luggage from your iPhone with the native Find My app — no extra downloads.</li><li><strong>Global Crowdsourced Network:</strong> Millions of Apple devices anonymously update your tracker's location anywhere in the world.</li><li><strong>6-Month Battery Life:</strong> USB-C recharge in 2 hours. No disposable batteries to replace before every trip.</li><li><strong>Separation Alert:</strong> Phone buzzes when your bag moves more than 50m away — catches theft and forgotten bags instantly.</li></ul><p>Card-sized, 1.6oz, slips into any luggage pocket. Also works on backpacks, camera bags, and strollers.</p>",
     "Travel Tech"),
    ("Foldable Bluetooth Keyboard", "Electronics", "PH5-TV-003", "29.99",
     "<h2>A Full Keyboard That Lives in Your Pocket</h2><p>Folds to the size of a credit card reader and unfolds into a full-size keyboard with 84 keys. Bluetooth 5.1 connects to your phone, tablet, and laptop simultaneously.</p><h3>Type Anywhere, On Anything</h3><ul><li><strong>Pocket-Sized Fold:</strong> 15.5 x 9.5 x 1.5cm folded — smaller than your phone.</li><li><strong>Full 84-Key Layout:</strong> Full-size keys with scissor switches — not the cramped thumb-typing of other \"portable\" keyboards.</li><li><strong>Tri-Device Switching:</strong> Paired with phone, tablet, and laptop. One button switches between them instantly.</li><li><strong>6-Month Standby:</strong> USB-C rechargeable. The auto-sleep/wake hinge turns on when you unfold it.</li></ul><p>Compatible with iOS, Android, Windows, and macOS. Write emails, edit documents, and send long messages without thumb fatigue.</p>",
     "Travel Tech"),
]

def create_product(title, ptype, sku, price, desc_html, tag):
    data = json.dumps({
        "product": {
            "title": title,
            "body_html": desc_html,
            "vendor": "AutoStream Commerce",
            "product_type": ptype,
            "tags": f"{tag}, Phase 5, Electronics, CJ-Pending",
            "status": "active",
            "variants": [{
                "sku": sku,
                "price": price,
                "inventory_management": "shopify",
                "inventory_quantity": 100,
                "requires_shipping": True,
                "taxable": True,
            }]
        }
    }).encode()

    req = urllib.request.Request(
        f"{BASE}/products.json",
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": TOKEN,
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            pid = result.get("product", {}).get("id")
            return pid, resp.status, None
    except urllib.error.HTTPError as e:
        return None, e.code, e.read().decode()[:200]

def main():
    print("=" * 60)
    print("PHASE 5: BULK LIST 20 ELECTRONICS PRODUCTS ON SHOPIFY")
    print(f"Store: wnun0z-h9.myshopify.com")
    print("=" * 60)

    created = []
    failed = []

    for i, (title, ptype, sku, price, desc_html, tag) in enumerate(PRODUCTS, 1):
        print(f"\n[{i}/20] {title}")
        print(f"    SKU: {sku} | Price: ${price} | Category: {tag}")

        pid, code, err = create_product(title, ptype, sku, price, desc_html, tag)

        if pid and code in (200, 201):
            print(f"    ✅ Created — Product ID: {pid}")
            created.append({"title": title, "id": pid, "sku": sku})
        else:
            print(f"    ❌ Failed — HTTP {code}: {err[:100] if err else 'Unknown'}")
            failed.append({"title": title, "sku": sku, "code": code, "error": err})

        time.sleep(0.75)  # Rate limit

    print("\n" + "=" * 60)
    print(f"SUMMARY: {len(created)}/20 created, {len(failed)} failed")
    print("=" * 60)

    if created:
        print("\nCreated Products:")
        for p in created:
            print(f"  ✅ {p['title']} (ID: {p['id']}, SKU: {p['sku']})")

    if failed:
        print("\nFailed Products:")
        for p in failed:
            print(f"  ❌ {p['title']} (HTTP {p['code']})")

    # Save report
    report = {"created": len(created), "failed": len(failed), "products": created, "failures": failed}
    with open("/home/team/shared/phase5_shopify_results.json", "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved to /home/team/shared/phase5_shopify_results.json")

    return len(created)

if __name__ == "__main__":
    main()
