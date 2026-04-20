const router = require('express').Router();
const Product = require('../models/Product');
const adminAuth = require('../middleware/auth');

// All price routes are admin-protected

// PUT /api/prices/single – update one product's price
router.put('/single', adminAuth, async (req, res, next) => {
  try {
    const { product_id, price } = req.body;
    if (!product_id || price === undefined) {
      return res.status(400).json({ error: 'product_id and price are required.' });
    }
    
    const product = await Product.findByIdAndUpdate(
      product_id, 
      { price: parseFloat(price) },
      { new: true, select: 'name price' }
    );
    
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product, message: 'Price updated.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/prices/selective – apply discount to selected product IDs
router.post('/selective', adminAuth, async (req, res, next) => {
  try {
    const { product_ids, discount_type, discount_value } = req.body;
    if (!product_ids?.length || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'product_ids, discount_type (percentage|fixed), and discount_value required.' });
    }

    const value = parseFloat(discount_value);
    const validIds = product_ids.filter(id => id); // filter out empty strings
    
    const products = await Product.find({ _id: { $in: validIds } });
    
    const updated = [];
    for (const p of products) {
      if (discount_type === 'percentage') {
        if (value <= 0 || value >= 100) return res.status(400).json({ error: 'Percentage must be between 0 and 100.' });
        p.price = Math.round(p.price * (1 - value / 100.0) * 100) / 100;
      } else if (discount_type === 'fixed') {
        p.price = Math.max(0, Math.round((p.price - value) * 100) / 100);
      } else {
        return res.status(400).json({ error: 'discount_type must be "percentage" or "fixed".' });
      }
      await p.save();
      updated.push({ id: p._id.toString(), name: p.name, price: p.price });
    }

    res.json({ updated, count: updated.length, message: 'Selective price update applied.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/prices/global-discount – apply % discount to ALL products (stores original_price first)
router.post('/global-discount', adminAuth, async (req, res, next) => {
  try {
    const { discount_percentage } = req.body;
    const pct = parseFloat(discount_percentage);
    if (!pct || pct <= 0 || pct >= 100) {
      return res.status(400).json({ error: 'discount_percentage must be between 1 and 99.' });
    }

    const products = await Product.find({});
    const sample = [];
    
    for (const p of products) {
      if (p.original_price == null || p.original_price === p.price) {
        p.original_price = p.price;
      }
      p.price = Math.round(p.original_price * (1 - pct / 100.0) * 100) / 100;
      await p.save();
      
      if (sample.length < 5) {
        sample.push({ id: p._id.toString(), name: p.name, original_price: p.original_price, price: p.price });
      }
    }

    res.json({
      updated_count: products.length,
      message: `Global ${pct}% discount applied to all products.`,
      sample
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prices/undo-offer – restore all products to original_price
router.post('/undo-offer', adminAuth, async (req, res, next) => {
  try {
    const products = await Product.find({ original_price: { $ne: null, $gt: 0 } });
    
    for (const p of products) {
      p.price = p.original_price;
      await p.save();
    }
    
    res.json({
      restored_count: products.length,
      message: 'All product prices restored to original.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
