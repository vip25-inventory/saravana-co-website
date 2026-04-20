const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  button_text: { type: String, default: 'Shop Now' },
  button_link: { type: String, default: '/lists.html' },
  bg_color_class: { type: String, default: 'bg-gold-grad' },
  image_url: { type: String },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Banner', bannerSchema);
