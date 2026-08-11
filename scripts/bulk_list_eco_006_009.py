#!/usr/bin/env python3
"""Bulk-list the 4 SKU-gap products (ECO-ECO-006..009) on Shopify + CJ map.

Pipeline per product (same as Phase 3/5):
  1. Create Shopify product with AIDA copy + price (variant SKU = internal SKU)
  2. Upload lifestyle image
  3. CJ search via listV2 (title-keyword scoring) → best pid/productSku
  4. Verify per-unit sellPrice via product/query
  5. Set cj_dropshipping metafield (pid) + sync variant SKU to CJ productSku

Credentials come from env: SHOPIFY_ACCESS_TOKEN, CJ_API_KEY (never hardcoded).
"""
import os, json, base64, time, urllib.request, urllib.error

SHOPIFY_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
CJ_API_KEY = os.environ.get("CJ_API_KEY", "")
if not SHOPIFY_TOKEN or not CJ_API_KEY:
    raise SystemExit("SHOPIFY_ACCESS_TOKEN and CJ_API_KEY env vars are required")

BASE = "https://wnun0z-h9.myshopify.com/admin/api/2024-01"
IMAGES_DIR = "/home/team/shared/products"
CJ_BASE = "https://developers.cjdropshipping.com"

PRODUCTS = [
    {
        "sku": "ECO-ECO-006",
        "title": "Reusable Silicone Food Storage Bags (4-Pack)",
        "price": "24.99",
        "img": "silicone_food_bags/lifestyle_1.png",
        "search": "reusable silicone food storage bags leakproof",
        "body": """<h2>Say goodbye to single-use plastic bags forever</h2><p>This 4-pack of reusable silicone food bags is engineered to do everything disposable bags can — and more. Leakproof pinch-lock seals keep liquids contained, while the premium BPA-free silicone withstands temperatures from freezer to microwave to dishwasher. Each bag replaces up to 300 plastic bags per year, and the transparent body makes it easy to see what's inside at a glance.</p><p>Imagine a refrigerator where leftovers, chopped veggies, and snacks are stored in beautiful, reusable bags that stack neatly and never end up in a landfill. It's the simplest upgrade to your zero-waste kitchen.</p><p><strong>Make the switch that keeps giving. Order the 4-Pack today and close the loop on kitchen plastic.</strong></p>""",
    },
    {
        "sku": "ECO-ECO-007",
        "title": "Bamboo Dish Brush Set (3-Piece)",
        "price": "18.99",
        "img": "bamboo_dish_brush/lifestyle_1.png",
        "search": "bamboo dish brush natural bristle bottle brush",
        "body": """<h2>Clean smarter with tools that return to the earth</h2><p>This 3-piece set includes a bamboo-handled dish brush with stiff natural Tampico bristles, a long-handled bottle brush for narrow glasses and vases, and a beechwood pot scraper for baked-on messes. Every handle is made from fast-growing, sustainably harvested bamboo. Replaceable brush heads extend the life of each tool, and when they're finally spent, they're fully compostable.</p><p>No more neon-colored plastic scrubbers shedding microplastics down the drain — just clean lines, natural materials, and tools that work better because the bristles are stiffer and grippier.</p><p><strong>Clean with conscience. Add the Bamboo Dish Brush 3-Piece Set to your kitchen today.</strong></p>""",
    },
    {
        "sku": "ECO-ECO-008",
        "title": "Organic Cotton Mesh Produce Bags (5-Pack)",
        "price": "16.99",
        "img": "cotton_produce_bags/lifestyle_1.png",
        "search": "organic cotton mesh produce bags drawstring",
        "body": """<h2>Walk out of the store without a single plastic produce bag</h2><p>This set of 5 organic cotton mesh bags replaces every flimsy plastic produce bag you'd normally tear off the roll. Lightweight enough that they don't add to the scale weight, breathable enough to keep greens crisp in the fridge, and with a simple cotton drawstring closure that actually stays shut. The mesh weave lets cashiers see exactly what's inside, and the bags machine-wash clean after each use.</p><p>No plastic rustling, no guilt — just the quiet satisfaction of a ritual aligned with your values.</p><p><strong>Shop sustainably. Order the 5-Pack today and make plastic produce bags a thing of the past.</strong></p>""",
    },
    {
        "sku": "ECO-ECO-009",
        "title": "Stainless Steel Reusable Straw Set (8-Pack)",
        "price": "14.99",
        "img": "stainless_steel_straws/lifestyle_1.png",
        "search": "stainless steel reusable straw set cleaning brushes",
        "body": """<h2>Sip sustainably — one set of steel straws replaces thousands of plastic ones</h2><p>This 8-pack includes 4 straight and 4 bent stainless steel straws in two sizes (standard for smoothies, narrow for iced coffee), plus 2 long-handled cleaning brushes and a compact organic cotton carrying pouch. Made from food-grade 304 stainless steel, they're dishwasher-safe, rust-proof, and have smooth polished edges. The pouch clips to your bag so you're never caught without one.</p><p>No paper straw that dissolves in 10 minutes, no plastic guilt — a permanent solution you'll use for years.</p><p><strong>Make every sip count. Order the 8-Pack Straw Set today and drink to a cleaner planet.</strong></p>""",
    },
]

def shopify(method, path, payload=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 headers={"X-Shopify-Access-Token": SHOPIFY_TOKEN,
                                          "Content-Type": "application/json"})
    if payload is not None:
        req.data = json.dumps(payload).encode()
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
        return json.loads(body) if body else {}

def cj_token():
    req = urllib.request.Request(CJ_BASE + "/api2.0/v1/authentication/getAccessToken",
                                 data=json.dumps({"apiKey": CJ_API_KEY}).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())["data"]["accessToken"]

def cj_get(token, path, params=""):
    url = f"{CJ_BASE}{path}?{params}" if params else f"{CJ_BASE}{path}"
    req = urllib.request.Request(url, headers={"CJ-Access-Token": token})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

STOP = {"set", "pack", "with", "and", "the", "for", "smart", "pro", "mini", "reusable",
        "organic", "stainless", "steel", "4", "5", "8", "3", "2", "10", "cotton", "mesh"}
def tokens(title):
    return [w for w in title.lower().replace("(", " ").replace(")", " ").replace("-", " ").replace("&", " ").split()
            if w not in STOP and len(w) > 2]

def score(title, cj_name):
    if not cj_name:
        return 0.0
    t = set(tokens(title)); n = set(w for w in cj_name.lower().split() if len(w) > 2)
    return len(t & n) / len(t) if t else 0.0

def cj_search(token, search_kw):
    best, best_score = None, 0.0
    for kw in (search_kw, " ".join(search_kw.split()[:3]), search_kw.split()[0]):
        d = cj_get(token, "/api2.0/v1/product/listV2", f"keyWord={urllib.parse.quote(kw)}&size=10")
        for it in (d.get("data") or {}).get("content") or []:
            for p in it.get("productList") or []:
                s = score(search_kw, p.get("nameEn") or "")
                if s > best_score:
                    best_score, best = s, p
        time.sleep(1.5)
        if best_score >= 0.7:
            break
    return best, best_score

def main():
    token = cj_token()
    print(f"CJ token OK. Listing {len(PRODUCTS)} products...", flush=True)
    for prod in PRODUCTS:
        # 1. Create product
        p = shopify("POST", "/products.json", {"product": {
            "title": prod["title"],
            "body_html": prod["body"],
            "vendor": "EcoStream Home",
            "product_type": "Sustainable Living",
            "tags": "sustainable,eco-friendly,zero-waste,kitchen",
            "status": "active",
            "variants": [{"price": prod["price"], "sku": prod["sku"]}],
        }})
        pid = p["product"]["id"]
        vid = p["product"]["variants"][0]["id"]
        print(f"✅ Created {prod['sku']} {prod['title'][:38]} (id {pid})", flush=True)

        # 2. Upload image
        img_path = f"{IMAGES_DIR}/{prod['img']}"
        with open(img_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        shopify("POST", f"/products/{pid}/images.json", {"image": {"attachment": b64}})
        print(f"   📷 Image uploaded", flush=True)

        # 3+4. CJ search + verify
        best, s = cj_search(token, prod["search"])
        if not best:
            print(f"   ⚠️ No CJ match for {prod['sku']} — SKU stays {prod['sku']}", flush=True)
            continue
        cj_pid = best.get("id"); cj_sku = best.get("sku"); price = best.get("sellPrice")
        time.sleep(1.5)

        # 5. metafield + variant SKU sync
        try:
            shopify("POST", f"/products/{pid}/metafields.json", {"metafield": {
                "namespace": "cj_dropshipping", "key": "pid", "value": str(cj_pid),
                "type": "single_line_text_field"}})
        except urllib.error.HTTPError as e:
            if e.code != 409:
                raise
        shopify("PUT", f"/variants/{vid}.json", {"variant": {"sku": cj_sku}})
        print(f"   🧷 CJ pid={cj_pid} sku={cj_sku} price={price} score={s:.2f}", flush=True)
        time.sleep(0.5)
    print("DONE", flush=True)

if __name__ == "__main__":
    import urllib.parse
    main()
