#!/usr/bin/env python3
"""Bulk-list all 26 Phase 3 products on Shopify and upload images."""

import os, json, base64, time, urllib.request, urllib.error

TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
BASE = "https://wnun0z-h9.myshopify.com/admin/api/2024-01"
IMAGES_DIR = "/home/team/shared/products"

# Complete Phase 3 catalog with image directory mapping
PRODUCTS = [
    # Pet Care
    ("Smart Feeder", "Pet Supplies", "ECO-PET-001", "129.99",
     "<h2>Feed your pet from anywhere</h2><p>Smart automatic pet feeder with HD camera and app control. Schedule meals, dispense treats, and check on your pet remotely. Holds 6L of dry food.</p>",
     "Pet Care", "smart_feeder"),
    ("GPS Pet Tracker", "Pet Supplies", "ECO-PET-002", "49.99",
     "<h2>Never lose track of your pet</h2><p>Real-time GPS tracker with no monthly subscription. Waterproof, lightweight, and comfortable. Long battery life up to 7 days.</p>",
     "Pet Care", "gps_tracker"),
    ("Biodegradable Poop Bags (500ct)", "Pet Supplies", "ECO-PET-003", "24.99",
     "<h2>Eco-friendly waste solution</h2><p>500-count bulk pack of biodegradable poop bags. Made from plant-based materials that decompose naturally. Strong and leak-proof.</p>",
     "Pet Care", "poop_bags"),
    ("Calming Hemp Treats (60ct)", "Pet Supplies", "ECO-PET-004", "19.99",
     "<h2>Natural calm for anxious pets</h2><p>Hemp-infused calming treats for dogs and cats. Perfect for thunderstorms, travel, and separation anxiety. 60 treats per bag.</p>",
     "Pet Care", "hemp_treats"),
    ("Silicone Slow Feeder Lick Mat", "Pet Supplies", "ECO-PET-005", "12.99",
     "<h2>Slow down mealtime</h2><p>Silicone lick mat that reduces bloat and improves digestion. Creates mental stimulation during feeding. Dishwasher safe.</p>",
     "Pet Care", "lick_mat"),
    ("Memory Foam Bed", "Pet Supplies", "ECO-PET-006", "79.99",
     "<h2>Luxury comfort for joint health</h2><p>Premium orthopedic memory foam pet bed with cooling gel. Supports joints and relieves pressure points. Machine washable cover.</p>",
     "Pet Care", "pet_bed"),
    ("Portable Pet Water Bottle", "Pet Supplies", "ECO-PET-007", "16.99",
     "<h2>Hydration on the go</h2><p>One-hand portable pet water bottle with leak-proof design. BPA-free, perfect for walks, hikes, and travel.</p>",
     "Pet Care", "pet_bottle"),
    ("Self-Cleaning Slicker Brush", "Pet Supplies", "ECO-PET-008", "14.99",
     "<h2>No more tangled fur</h2><p>Self-cleaning slicker brush with retractable bristles. Removes loose fur and reduces shedding. Comfortable ergonomic grip.</p>",
     "Pet Care", "slicker_brush"),
    ("Interactive Laser Toy", "Pet Supplies", "ECO-PET-009", "19.99",
     "<h2>Hours of entertainment</h2><p>USB rechargeable interactive laser toy. Automatic mode with random patterns keeps pets active and engaged.</p>",
     "Pet Care", "laser_toy"),
    ("Bamboo Pet Bowl Set", "Pet Supplies", "ECO-PET-010", "22.99",
     "<h2>Eco-friendly dining</h2><p>Beautiful bamboo pet bowl set with raised design. Includes food and water bowls with non-slip base.</p>",
     "Pet Care", "pet_bowl_set"),
    # Wellness & Self-Care
    ("Weighted Cooling Blanket (15lb)", "Wellness", "ECO-WELL-001", "99.99",
     "<h2>Sleep deeper, feel cooler</h2><p>Weighted cooling blanket for anxiety relief and better sleep. Premium glass bead fill with moisture-wicking cotton cover.</p>",
     "Wellness", "weighted_blanket"),
    ("Sunrise Alarm Clock", "Wellness", "ECO-WELL-002", "49.99",
     "<h2>Wake up naturally</h2><p>Sunrise simulation alarm clock with gradual natural light, sunset fading, nature sounds, and touch controls.</p>",
     "Wellness", "sunrise_clock"),
    ("Ultrasonic Wood Diffuser", "Wellness", "ECO-WELL-003", "34.99",
     "<h2>Premium aromatherapy</h2><p>Beautiful wood-grain ultrasonic essential oil diffuser. Covers 500 sq ft, auto shut-off, whisper-quiet operation.</p>",
     "Wellness", "wood_diffuser"),
    ("Silk Pillowcase and Mask Set", "Wellness", "ECO-WELL-004", "45.00",
     "<h2>Luxury silk for beauty sleep</h2><p>100% mulberry silk pillowcase and matching sleep mask set. Reduces hair frizz and prevents sleep wrinkles.</p>",
     "Wellness", "silk_set"),
    ("Electric Scalp Massager", "Wellness", "ECO-WELL-005", "39.99",
     "<h2>Relieve tension naturally</h2><p>Electric scalp massager with deep-kneading nodes. Stimulates circulation, relieves headaches. Waterproof, USB rechargeable.</p>",
     "Wellness", "scalp_massager"),
    ("Silicone Wrinkle Patches", "Wellness", "ECO-WELL-006", "19.99",
     "<h2>Wake up younger looking</h2><p>Reusable silicone wrinkle patches for overnight use. Smooth fine lines and prevent sleep wrinkles. Medical-grade, hypoallergenic.</p>",
     "Wellness", "wrinkle_patches"),
    ("Gratitude Journal", "Wellness", "ECO-WELL-007", "24.99",
     "<h2>Transform your mindset</h2><p>Beautiful faux leather gratitude journal with daily prompts. 365 days of guided reflection with ribbon bookmark.</p>",
     "Wellness", "gratitude_journal"),
    ("Blue Light Blocking Glasses", "Wellness", "ECO-WELL-008", "29.99",
     "<h2>Protect your eyes</h2><p>Blue light blocking glasses with stylish frames. Reduces eye strain from screens and improves sleep quality.</p>",
     "Wellness", "blue_light_glasses"),
    ("Microcurrent Facial Device", "Wellness", "ECO-WELL-009", "129.99",
     "<h2>Spa-grade facial toning</h2><p>Professional microcurrent facial device for lifting and toning. Reduces fine lines and improves skin elasticity. USB rechargeable.</p>",
     "Wellness", "facial_device"),
    ("Organic Cotton Yoga Bolster", "Wellness", "ECO-WELL-010", "44.99",
     "<h2>Support your practice</h2><p>Organic cotton yoga bolster with buckwheat filling. Perfect for restorative poses and meditation. Washable cover.</p>",
     "Wellness", "yoga_bolster"),
    # Sustainable Living
    ("Bamboo Cutlery Set", "Home & Kitchen", "ECO-ECO-001", "18.00",
     "<h2>Sustainable dining on the go</h2><p>Portable bamboo cutlery set with knife, fork, spoon, chopsticks, and straw. Cotton carry pouch included. Plastic-free.</p>",
     "Sustainable Living", "bamboo_cutlery"),
    ("Countertop Compost Bin", "Home & Kitchen", "ECO-ECO-002", "45.00",
     "<h2>Turn waste into garden gold</h2><p>Sleek countertop compost bin with charcoal filter. Stainless steel, holds 1.3 gallons. Odor control included.</p>",
     "Sustainable Living", "compost_bin"),
    ("Glass Jars with Bamboo Lids", "Home & Kitchen", "ECO-ECO-003", "55.00",
     "<h2>Beautiful pantry storage</h2><p>Set of glass storage jars with bamboo lids. Airtight seal keeps contents fresh. Perfect for zero-waste living.</p>",
     "Sustainable Living", "glass_jars"),
    ("Electric Arc Lighter", "Home & Kitchen", "ECO-ECO-004", "19.99",
     "<h2>Windproof flameless lighter</h2><p>Rechargeable USB electric arc lighter. Windproof, flameless, no butane needed. Eco-friendly for candles and grills.</p>",
     "Sustainable Living", "arc_lighter"),
    ("Wool Dryer Balls (6-Pack)", "Home & Kitchen", "ECO-ECO-005", "22.00",
     "<h2>Naturally soften laundry</h2><p>Set of 6 premium New Zealand wool dryer balls. Reduces drying time by 25%. Chemical-free fabric softening, lasts 1000+ loads.</p>",
     "Sustainable Living", "dryer_balls"),
    ("Bamboo Toothbrush (10-Pack)", "Home & Kitchen", "ECO-ECO-010", "14.99",
     "<h2>Plastic-free oral care</h2><p>10-pack of biodegradable bamboo toothbrushes. Charcoal-infused handles. Compostable and recyclable packaging.</p>",
     "Sustainable Living", "bamboo_toothbrush"),
]

def create_product(title, product_type, sku, price, desc_html, tag):
    payload = json.dumps({
        "product": {
            "title": title,
            "body_html": desc_html,
            "vendor": "EcoStream",
            "product_type": product_type,
            "status": "active",
            "tags": f"EcoStream, {tag}",
            "variants": [{
                "price": price,
                "sku": sku,
                "inventory_quantity": 20,
                "inventory_management": "shopify",
                "requires_shipping": True
            }]
        }
    })
    
    req = urllib.request.Request(
        f"{BASE}/products.json",
        data=payload.encode('utf-8'),
        headers={
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        product = data.get("product", {})
        pid = product.get("id")
        code = resp.getcode()
        return pid, code, None
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        return None, e.code, body

def upload_image(product_id, img_path, filename):
    with open(img_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    payload = json.dumps({"image": {"attachment": img_b64, "filename": filename}})
    
    req = urllib.request.Request(
        f"{BASE}/products/{product_id}/images.json",
        data=payload.encode('utf-8'),
        headers={
            "X-Shopify-Access-Token": TOKEN,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        code = resp.getcode()
        return code, None
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        return e.code, body

# Main
products_ok = 0
products_fail = 0
images_ok = 0
images_fail = 0
images_skip = 0

print("=" * 60)
print("BULK LISTING: 26 Phase 3 Products + Images")
print("=" * 60)

for i, (title, ptype, sku, price, desc, tag, img_dir) in enumerate(PRODUCTS, 1):
    print(f"\n[{i}/26] {title} (${price})")
    
    # Create product
    pid, code, err = create_product(title, ptype, sku, price, desc, tag)
    
    if pid and code in (200, 201):
        print(f"  ✅ Product created (ID: {pid})")
        products_ok += 1
        
        # Upload images
        dir_path = os.path.join(IMAGES_DIR, img_dir)
        if os.path.isdir(dir_path):
            images = sorted([f for f in os.listdir(dir_path) if f.endswith(('.png', '.jpg'))])
            for img_file in images:
                img_path = os.path.join(dir_path, img_file)
                filename = f"{img_dir}-{img_file}"
                kb = os.path.getsize(img_path) / 1024
                icode, ierr = upload_image(pid, img_path, filename)
                if icode in (200, 201):
                    print(f"    ✅ {img_file} ({kb:.0f}KB)")
                    images_ok += 1
                else:
                    print(f"    ❌ {img_file} -> HTTP {icode}")
                    images_fail += 1
                time.sleep(0.6)
        else:
            print(f"  ⚠️  No image directory: {img_dir}")
            images_skip += 1
    else:
        print(f"  ❌ Failed (HTTP {code}): {err}")
        products_fail += 1
    
    # Rate limit
    time.sleep(0.8)

print(f"\n{'=' * 60}")
print(f"PRODUCTS: {products_ok} created, {products_fail} failed")
print(f"IMAGES:   {images_ok} uploaded, {images_fail} failed, {images_skip} skipped")
print(f"{'=' * 60}")
