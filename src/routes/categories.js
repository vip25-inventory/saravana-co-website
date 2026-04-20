const router = require('express').Router();
const Category = require('../models/Category');
const ProductType = require('../models/ProductType');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/product-types?category_id=
router.get('/types', async (req, res, next) => {
  try {
    const { category_id } = req.query;
    let query = {};
    if (category_id) {
      query.category_id = category_id;
    }
    const product_types = await ProductType.find(query).sort({ name: 1 });
    res.json({ product_types });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
