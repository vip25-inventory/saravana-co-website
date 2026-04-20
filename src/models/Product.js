const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  product_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType' },
  price: { type: Number, required: true },
  original_price: { type: Number },
  description: { type: String },
  image_urls: [{ type: String }],
  stock: { type: Number, default: 0 },
  is_top_selling: { type: Boolean, default: false },
  is_new_arrival: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Product', productSchema);
