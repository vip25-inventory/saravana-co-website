const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const adminAuth = require('../middleware/auth');

// ── Public Routes ────────────────────────────────────────────

// GET /api/products – list with filters, search, pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      category, category_id, product_type_id,
      min_price, max_price, search,
      is_top_selling, is_new_arrival,
      page = 1, limit = 12, sort = 'created_at_desc'
    } = req.query;

    const query = {};

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category_id = cat._id;
      // if not found, we'll probably return empty correctly since category_id won't match ObjectId
      else query.category_id = null; 
    }
    if (category_id) query.category_id = category_id;
    if (product_type_id) query.product_type_id = product_type_id;
    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = parseFloat(min_price);
      if (max_price) query.price.$lte = parseFloat(max_price);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (is_top_selling === 'true') query.is_top_selling = true;
    if (is_new_arrival === 'true') query.is_new_arrival = true;

    const sortMap = {
      'created_at_desc': { created_at: -1 },
      'price_asc': { price: 1 },
      'price_desc': { price: -1 },
      'name_asc': { name: 1 },
    };
    const sortObj = sortMap[sort] || { created_at: -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [total, productsRaw] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate('category_id')
        .populate('product_type_id')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
    ]);

    const products = productsRaw.map(p => {
      const doc = p.toObject();
      doc.category_name = p.category_id ? p.category_id.name : null;
      doc.category_slug = p.category_id ? p.category_id.slug : null;
      doc.product_type_name = p.product_type_id ? p.product_type_id.name : null;
      // Ensure IDs are strings even if populated for frontend form matching
      doc.category_id = p.category_id ? p.category_id._id.toString() : null;
      doc.product_type_id = p.product_type_id ? p.product_type_id._id.toString() : null;
      return doc;
    });

    res.json({
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id – single product with similar products
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pRaw = await Product.findById(id)
      .populate('category_id')
      .populate('product_type_id');

    if (!pRaw) return res.status(404).json({ error: 'Product not found.' });

    const product = pRaw.toObject();
    product.category_name = pRaw.category_id ? pRaw.category_id.name : null;
    product.category_slug = pRaw.category_id ? pRaw.category_id.slug : null;
    product.product_type_name = pRaw.product_type_id ? pRaw.product_type_id.name : null;
    // Flatten populated IDs back to strings for frontend form selects
    product.category_id = pRaw.category_id ? pRaw.category_id._id.toString() : null;
    product.product_type_id = pRaw.product_type_id ? pRaw.product_type_id._id.toString() : null;

    // Similar by category
    const similarCatRaw = await Product.aggregate([
      { $match: { category_id: pRaw.category_id?._id, _id: { $ne: pRaw._id } } },
      { $sample: { size: 4 } }
    ]);
    const similar_category = await Product.populate(similarCatRaw, [
      { path: 'category_id' }, { path: 'product_type_id' }
    ]).then(list => list.map(item => ({
      ...item, 
      id: item._id.toString(),
      category_name: item.category_id?.name,
      product_type_name: item.product_type_id?.name
    })));

    // Similar by product type
    let similar_type = [];
    if (pRaw.product_type_id) {
      const similarTypeRaw = await Product.aggregate([
        { $match: { product_type_id: pRaw.product_type_id?._id, _id: { $ne: pRaw._id } } },
        { $sample: { size: 4 } }
      ]);
      similar_type = await Product.populate(similarTypeRaw, [
        { path: 'category_id' }, { path: 'product_type_id' }
      ]).then(list => list.map(item => ({
        ...item, 
        id: item._id.toString(),
        category_name: item.category_id?.name,
        product_type_name: item.product_type_id?.name
      })));
    }

    res.json({
      product,
      similar_category,
      similar_type,
    });
  } catch (err) {
    next(err);
  }
});

// ── Admin Routes ─────────────────────────────────────────────

// POST /api/products (admin)
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const {
      name, category_id, product_type_id, price, description,
      image_urls = [], stock = 0, is_top_selling = false, is_new_arrival = false
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    const imgArray = typeof image_urls === 'string'
      ? image_urls.split(',').map(u => u.trim()).filter(Boolean)
      : image_urls;

    const product = new Product({
      name, 
      category_id: category_id || null, 
      product_type_id: product_type_id || null, 
      price: parseFloat(price), 
      original_price: parseFloat(price), 
      description: description || '', 
      image_urls: imgArray, 
      stock: parseInt(stock), 
      is_top_selling: !!is_top_selling, 
      is_new_arrival: !!is_new_arrival
    });

    await product.save();
    res.status(201).json({ product, message: 'Product created successfully.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, category_id, product_type_id, price, description,
      image_urls, stock, is_top_selling, is_new_arrival
    } = req.body;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    if (image_urls !== undefined) {
      product.image_urls = typeof image_urls === 'string'
        ? image_urls.split(',').map(u => u.trim()).filter(Boolean)
        : image_urls;
    }

    if (name !== undefined) product.name = name;
    if (category_id !== undefined) product.category_id = category_id || null;
    if (product_type_id !== undefined) product.product_type_id = product_type_id || null;
    if (price !== undefined) product.price = parseFloat(price);
    if (description !== undefined) product.description = description;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (is_top_selling !== undefined) product.is_top_selling = !!is_top_selling;
    if (is_new_arrival !== undefined) product.is_new_arrival = !!is_new_arrival;

    await product.save();
    res.json({ product, message: 'Product updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
