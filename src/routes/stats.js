const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const adminAuth = require('../middleware/auth');

// GET /api/stats – dashboard summary (admin)
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, totalProducts, activeOffers, pendingOrders, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      Offer.countDocuments({
        is_active: true,
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() }
      }),
      Order.countDocuments({ status: 'Pending' }),
      Order.aggregate([
        { 
          $match: { 
            created_at: { $gte: today }, 
            status: { $ne: 'Cancelled' } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            revenue: { $sum: '$total_amount' } 
          } 
        }
      ])
    ]);

    res.json({
      total_orders: totalOrders,
      total_products: totalProducts,
      active_offers: activeOffers,
      today_revenue: revenueAgg.length > 0 ? revenueAgg[0].revenue : 0,
      pending_orders: pendingOrders,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
