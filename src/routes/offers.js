const router = require('express').Router();
const Offer = require('../models/Offer');
const adminAuth = require('../middleware/auth');

// GET /api/offers – active offers (public)
router.get('/', async (req, res, next) => {
  try {
    const today = new Date();
    const offers = await Offer.find({
      is_active: true,
      start_date: { $lte: today },
      end_date: { $gte: today }
    }).sort({ created_at: -1 });

    res.json({ offers });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/offers – all offers (admin)
router.get('/all', adminAuth, async (req, res, next) => {
  try {
    const offers = await Offer.find().sort({ created_at: -1 });
    res.json({ offers });
  } catch (err) {
    next(err);
  }
});

// POST /api/offers (admin)
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const { title, description, discount_percentage, start_date, end_date, is_active = true } = req.body;
    if (!title || !discount_percentage || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, discount_percentage, start_date, end_date are required.' });
    }
    
    const offer = new Offer({
      title, description, 
      discount_percentage: parseFloat(discount_percentage), 
      start_date, end_date, 
      is_active: !!is_active
    });
    await offer.save();

    res.status(201).json({ offer, message: 'Offer created.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/offers/:id (admin)
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { title, description, discount_percentage, start_date, end_date, is_active } = req.body;
    
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found.' });

    if (title !== undefined) offer.title = title;
    if (description !== undefined) offer.description = description;
    if (discount_percentage !== undefined) offer.discount_percentage = parseFloat(discount_percentage);
    if (start_date !== undefined) offer.start_date = start_date;
    if (end_date !== undefined) offer.end_date = end_date;
    if (is_active !== undefined) offer.is_active = !!is_active;

    await offer.save();
    
    res.json({ offer, message: 'Offer updated.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offers/:id (admin)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found.' });
    res.json({ message: 'Offer deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
