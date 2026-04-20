const router = require('express').Router();
const Banner = require('../models/Banner');
const adminAuth = require('../middleware/auth');

// GET /api/banners – active banners sorted (public)
router.get('/', async (req, res, next) => {
  try {
    const banners = await Banner.find({ is_active: true }).sort({ sort_order: 1, created_at: 1 });
    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

// GET /api/banners/all – all banners (admin)
router.get('/all', adminAuth, async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ sort_order: 1, created_at: 1 });
    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

// POST /api/banners (admin)
router.post('/', adminAuth, async (req, res, next) => {
  try {
    const {
      title, subtitle, button_text = 'Shop Now', button_link = '/lists.html',
      bg_color_class = 'gold-grad', image_url, sort_order = 0, is_active = true
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Banner title is required.' });

    const banner = new Banner({
      title, subtitle, button_text, button_link, bg_color_class, image_url,
      sort_order: parseInt(sort_order) || 0,
      is_active: !!is_active
    });
    await banner.save();
    
    res.status(201).json({ banner, message: 'Banner created.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/banners/:id (admin)
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const { title, subtitle, button_text, button_link, bg_color_class, image_url, sort_order, is_active } = req.body;

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (button_text !== undefined) banner.button_text = button_text;
    if (button_link !== undefined) banner.button_link = button_link;
    if (bg_color_class !== undefined) banner.bg_color_class = bg_color_class;
    if (image_url !== undefined) banner.image_url = image_url;
    if (sort_order !== undefined) banner.sort_order = parseInt(sort_order) || 0;
    if (is_active !== undefined) banner.is_active = !!is_active;

    await banner.save();
    res.json({ banner, message: 'Banner updated.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/banners/:id (admin)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });
    res.json({ message: 'Banner deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
