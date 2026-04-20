"""
Management command: import_from_mongo
Migrates all data from MongoDB (test DB) → Django SQLite.

Usage:
    python manage.py import_from_mongo
    python manage.py import_from_mongo --db saravanaco   # specify DB name
    python manage.py import_from_mongo --wipe            # clear SQLite first
"""
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.text import slugify


class Command(BaseCommand):
    help = "Import all data from MongoDB into Django SQLite"

    def add_arguments(self, parser):
        parser.add_argument('--db', default='test', help='MongoDB database name')
        parser.add_argument('--wipe', action='store_true', help='Clear existing Django data first')

    def handle(self, *args, **options):
        try:
            import pymongo
        except ImportError:
            self.stderr.write("pymongo not installed. Run: pip install pymongo")
            sys.exit(1)

        from apps.catalog.models import Category, ProductType, Product, Banner, Offer
        from apps.orders.models import Order, OrderItem

        uri = settings.MONGODB_URI
        if not uri:
            self.stderr.write("MONGODB_URI not set in settings/env")
            sys.exit(1)

        self.stdout.write(f"Connecting to MongoDB...")
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
        try:
            client.server_info()
        except Exception as e:
            self.stderr.write(f"MongoDB connection failed: {e}")
            sys.exit(1)

        db_name = options['db']
        db = client[db_name]
        self.stdout.write(self.style.SUCCESS(f"Connected to MongoDB: {db_name}"))
        self.stdout.write(f"Collections: {db.list_collection_names()}")

        if options['wipe']:
            self.stdout.write(self.style.WARNING("Wiping existing SQLite data..."))
            OrderItem.objects.all().delete()
            Order.objects.all().delete()
            Product.objects.all().delete()
            ProductType.objects.all().delete()
            Banner.objects.all().delete()
            Offer.objects.all().delete()
            Category.objects.all().delete()
            self.stdout.write("  Done wiping.")

        # ObjectId → Django PK maps (for FK resolution)
        cat_map = {}      # mongo _id str → django Category instance
        ptype_map = {}    # mongo _id str → django ProductType instance
        product_map = {}  # mongo _id str → django Product instance

        # ── 1. Categories ────────────────────────────────────────
        self.stdout.write("\n[1/6] Importing categories...")
        cats_created = 0
        for doc in db.categories.find():
            oid = str(doc['_id'])
            name = doc.get('name', 'Unnamed')
            slug = doc.get('slug') or slugify(name) or f"cat-{oid[-6:]}"

            # Ensure unique slug
            base_slug = slug
            counter = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            cat, created = Category.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'icon': doc.get('icon', '📦'),
                }
            )
            cat_map[oid] = cat
            if created:
                cats_created += 1

        self.stdout.write(self.style.SUCCESS(f"  Categories: {cats_created} created, {len(cat_map)} total"))

        # ── 2. Product Types ──────────────────────────────────────
        self.stdout.write("[2/6] Importing product types...")
        ptypes_created = 0
        for doc in db.producttypes.find():
            oid = str(doc['_id'])
            cat_oid = str(doc.get('category_id', ''))
            cat = cat_map.get(cat_oid)

            if not cat:
                self.stdout.write(f"  WARN: ProductType {doc.get('name')} references unknown category {cat_oid}")
                continue

            pt, created = ProductType.objects.get_or_create(
                category=cat,
                name=doc.get('name', 'Unknown'),
            )
            ptype_map[oid] = pt
            if created:
                ptypes_created += 1

        self.stdout.write(self.style.SUCCESS(f"  ProductTypes: {ptypes_created} created, {len(ptype_map)} total"))

        # ── 3. Products ───────────────────────────────────────────
        self.stdout.write("[3/6] Importing products...")
        prods_created = 0
        for doc in db.products.find():
            oid = str(doc['_id'])
            cat_oid = str(doc.get('category_id', ''))
            ptype_oid = str(doc.get('product_type_id', ''))
            cat = cat_map.get(cat_oid)
            ptype = ptype_map.get(ptype_oid)

            image_urls = doc.get('image_urls', [])
            if isinstance(image_urls, str):
                image_urls = [u.strip() for u in image_urls.split(',') if u.strip()]

            price = float(doc.get('price', 0))
            orig_price = doc.get('original_price')
            orig_price = float(orig_price) if orig_price else price

            prod, created = Product.objects.get_or_create(
                name=doc.get('name', 'Unnamed Product'),
                defaults={
                    'category': cat,
                    'product_type': ptype,
                    'price': price,
                    'original_price': orig_price,
                    'description': doc.get('description', ''),
                    'image_urls': image_urls,
                    'stock': int(doc.get('stock', 0)),
                    'is_top_selling': bool(doc.get('is_top_selling', False)),
                    'is_new_arrival': bool(doc.get('is_new_arrival', False)),
                }
            )
            product_map[oid] = prod
            if created:
                prods_created += 1

        self.stdout.write(self.style.SUCCESS(f"  Products: {prods_created} created, {len(product_map)} total"))

        # ── 4. Banners ────────────────────────────────────────────
        self.stdout.write("[4/6] Importing banners...")
        banners_created = 0
        for doc in db.banners.find():
            _, created = Banner.objects.get_or_create(
                title=doc.get('title', 'Banner'),
                defaults={
                    'subtitle': doc.get('subtitle', ''),
                    'button_text': doc.get('button_text', 'Shop Now'),
                    'button_link': doc.get('button_link', '/lists.html'),
                    'bg_color_class': doc.get('bg_color_class', 'bg-gold-grad'),
                    'image_url': doc.get('image_url', ''),
                    'sort_order': int(doc.get('sort_order', 0)),
                    'is_active': bool(doc.get('is_active', True)),
                }
            )
            if created:
                banners_created += 1
        self.stdout.write(self.style.SUCCESS(f"  Banners: {banners_created} created"))

        # ── 5. Offers ─────────────────────────────────────────────
        self.stdout.write("[5/6] Importing offers...")
        offers_created = 0
        from django.utils import timezone
        import datetime
        for doc in db.offers.find():
            start = doc.get('start_date', timezone.now())
            end = doc.get('end_date', timezone.now())
            # Make timezone-aware if naive (MongoDB stores UTC naive datetimes)
            if isinstance(start, datetime.datetime) and start.tzinfo is None:
                start = timezone.make_aware(start, timezone.utc)
            if isinstance(end, datetime.datetime) and end.tzinfo is None:
                end = timezone.make_aware(end, timezone.utc)
            _, created = Offer.objects.get_or_create(
                title=doc.get('title', 'Offer'),
                defaults={
                    'description': doc.get('description', ''),
                    'discount_percentage': float(doc.get('discount_percentage', 0)),
                    'start_date': start,
                    'end_date': end,
                    'is_active': bool(doc.get('is_active', True)),
                }
            )
            if created:
                offers_created += 1
        self.stdout.write(self.style.SUCCESS(f"  Offers: {offers_created} created"))

        # ── 6. Admin Users ────────────────────────────────────────
        self.stdout.write("[6/6] Importing admin users...")
        users_created = 0
        for doc in db.adminusers.find():
            username = doc.get('username', 'admin')
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_superuser(
                    username=username,
                    password=settings.ADMIN_PASSWORD or 'Admin@1234',
                    email='',
                )
                users_created += 1
                self.stdout.write(f"  Created admin: {username} (password from ADMIN_PASSWORD env)")
        if users_created == 0:
            self.stdout.write("  Admin users already exist — skipped")

        # ── Summary ───────────────────────────────────────────────
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS("[OK] Import complete!"))

        self.stdout.write(f"  Categories : {Category.objects.count()}")
        self.stdout.write(f"  ProductTypes: {ProductType.objects.count()}")
        self.stdout.write(f"  Products   : {Product.objects.count()}")
        self.stdout.write(f"  Banners    : {Banner.objects.count()}")
        self.stdout.write(f"  Offers     : {Offer.objects.count()}")
        self.stdout.write(f"  Admin Users: {User.objects.filter(is_staff=True).count()}")
        client.close()
