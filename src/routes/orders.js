const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const adminAuth = require('../middleware/auth');

// ── Public Route ─────────────────────────────────────────────

// POST /api/orders – place an order (no auth needed)
router.post('/', async (req, res, next) => {
  try {
    const {
      customer_name, phone, email, address,
      city, state, pincode, payment_method = 'Cash on Delivery',
      notes, items
    } = req.body;

    if (!customer_name || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({ error: 'Name, phone, address, city, state, and pincode are required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    let total = 0;
    const validatedItems = [];
    for (const item of items) {
      if (!item.product_id || !item.quantity) {
        return res.status(400).json({ error: 'Each item must have product_id and quantity.' });
      }

      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer.' });
      }

      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Product ID ${item.product_id} not found.` });
      }

      const price = product.price; 
      total += price * qty;
      validatedItems.push({ 
        product_id: product._id, 
        product_name: product.name, 
        price, 
        quantity: qty 
      });
    }

    const order = new Order({
      customer_name, phone, email: email || null, address, 
      city, state, pincode, total_amount: Math.round(total * 100) / 100, 
      payment_method, notes: notes || null,
      items: validatedItems
    });

    await order.save();

    res.status(201).json({
      message: 'Order placed successfully!',
      order_id: order._id.toString(),
      order
    });
  } catch (err) {
    next(err);
  }
});

// ── Admin Routes ─────────────────────────────────────────────

// GET /api/orders (admin) – paginated + searchable
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, date_from, date_to } = req.query;
    
    const query = {};

    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      // ObjectId is exactly 24 hex chars
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        query.$or.push({ _id: search });
      }
    }
    if (status) {
      query.status = status;
    }
    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) query.created_at.$gte = new Date(date_from);
      if (date_to) query.created_at.$lte = new Date(date_to + 'T23:59:59');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [total, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum)
    ]);

    res.json({
      orders,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id (admin)
router.get('/:id', adminAuth, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Format matches SQL expectations
    res.json({ order, items: order.items });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status (admin)
router.put('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'In Transit', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    
    res.json({ order, message: 'Order status updated.' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id (admin - full edit)
router.put('/:id', adminAuth, async (req, res, next) => {
  try {
    const {
      customer_name, phone, email, address,
      city, state, pincode, payment_method, notes
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (customer_name !== undefined) order.customer_name = customer_name;
    if (phone !== undefined) order.phone = phone;
    if (email !== undefined) order.email = email;
    if (address !== undefined) order.address = address;
    if (city !== undefined) order.city = city;
    if (state !== undefined) order.state = state;
    if (pincode !== undefined) order.pincode = pincode;
    if (payment_method !== undefined) order.payment_method = payment_method;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    res.json({ order, message: 'Order details updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id (admin)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ message: 'Order deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
