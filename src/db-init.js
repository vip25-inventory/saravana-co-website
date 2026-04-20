require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Category = require('./models/Category');
const ProductType = require('./models/ProductType');
const Product = require('./models/Product');
const AdminUser = require('./models/AdminUser');
const Banner = require('./models/Banner');
const Offer = require('./models/Offer');
const Order = require('./models/Order');

console.log("ENV URI:", process.env.MONGODB_URI);
async function init() {
  await connectDB();

  try {
    console.log('🔧 Wiping existing collections...');
    await Promise.all([
      Category.deleteMany({}),
      ProductType.deleteMany({}),
      Product.deleteMany({}),
      AdminUser.deleteMany({}),
      Banner.deleteMany({}),
      Offer.deleteMany({}),
      Order.deleteMany({}),
    ]);
    console.log('✅ Collections cleared.');

    console.log('🌱 Seeding administrative accounts...');
    // Hash generated for Admin@1234
    await AdminUser.create({
      username: 'admin',
      password_hash: '$2a$10$nF6Yc5JxgH.QHM3v8l3qkuWZvMEKLZsrI3m7R3mMcXH4Y5K8p7GXG'
    });

    console.log('🌱 Seeding categories...');
    const catData = [
      { name: 'Refrigerators', slug: 'refrigerators', icon: '❄️' },
      { name: 'Washing Machines', slug: 'washing-machines', icon: '🧺' },
      { name: 'Smart TVs', slug: 'smart-tvs', icon: '📺' },
      { name: 'Sofas', slug: 'sofas', icon: '🛋️' },
      { name: 'Beds', slug: 'beds', icon: '🛏️' },
      { name: 'Air Conditioners', slug: 'air-conditioners', icon: '🌬️' },
      { name: 'Kitchen Appliances', slug: 'kitchen-appliances', icon: '🍳' },
      { name: 'Furniture', slug: 'furniture', icon: '🪑' }
    ];
    const catDocs = await Category.insertMany(catData);
    const catMap = {};
    for (const c of catDocs) catMap[c.slug] = c._id;

    console.log('🌱 Seeding product types...');
    const ptData = [
      { category_id: catMap['refrigerators'], name: 'Single Door' },
      { category_id: catMap['refrigerators'], name: 'Double Door' },
      { category_id: catMap['washing-machines'], name: 'Front Load' },
      { category_id: catMap['smart-tvs'], name: '55 inch' },
      { category_id: catMap['sofas'], name: '3 Seater' },
      { category_id: catMap['beds'], name: 'King Size' },
      { category_id: catMap['air-conditioners'], name: 'Split AC' },
      { category_id: catMap['kitchen-appliances'], name: 'Air Fryer' },
      { category_id: catMap['kitchen-appliances'], name: 'Mixer Grinder' },
      { category_id: catMap['kitchen-appliances'], name: 'Microwave' },
      { category_id: catMap['furniture'], name: 'Dining Table' }
    ];
    const ptDocs = await ProductType.insertMany(ptData);
    const ptMap = {}; // mapping by name just for quick seeder
    for (const pt of ptDocs) ptMap[pt.name] = pt._id;

    console.log('🌱 Seeding products...');
    const prodData = [
      {
        name: 'LG 8kg Front Load Washing Machine', category_id: catMap['washing-machines'], product_type_id: ptMap['Front Load'],
        price: 34490, original_price: 38000, description: 'LG 8kg Fully Automatic Front Load Washing Machine with AI Direct Drive technology.', stock: 15, is_top_selling: true
      },
      {
        name: 'Samsung 55" 4K QLED Smart TV', category_id: catMap['smart-tvs'], product_type_id: ptMap['55 inch'],
        price: 52990, original_price: 65000, description: 'Samsung Crystal 4K QLED Smart TV with Tizen OS and 4K upscaling.', stock: 8, is_top_selling: true
      },
      {
        name: 'Whirlpool 265L Double Door Refrigerator', category_id: catMap['refrigerators'], product_type_id: ptMap['Double Door'],
        price: 28990, original_price: 34000, description: 'Whirlpool 265L Frost Free Double Door Refrigerator with 6th Sense Technology.', stock: 12, is_top_selling: true
      },
      {
        name: 'Royal Comfort 3-Seater Velvet Sofa', category_id: catMap['sofas'], product_type_id: ptMap['3 Seater'],
        price: 22500, original_price: 28000, description: 'Premium 3-Seater Velvet Sofa in Emerald Green with solid wood frame.', stock: 5, is_top_selling: true
      },
      {
        name: 'King Size Teak Bed with Storage', category_id: catMap['beds'], product_type_id: ptMap['King Size'],
        price: 45000, original_price: 55000, description: 'Traditional Indian teak wood king size bed with hydraulic storage system.', stock: 4, is_top_selling: true
      },
      {
        name: 'Blue Star 1.5 Ton Split AC 3 Star', category_id: catMap['air-conditioners'], product_type_id: ptMap['Split AC'],
        price: 37990, original_price: 44000, description: 'Blue Star 1.5 Ton 3 Star Inverter Split AC with Auto Cleanser technology.', stock: 10, is_top_selling: true
      },
      {
        name: 'Philips Digital Air Fryer 4.1L', category_id: catMap['kitchen-appliances'], product_type_id: ptMap['Air Fryer'],
        price: 7299, original_price: 9000, description: 'Philips 4.1L Essential AirFryer with Rapid Air Technology.', stock: 20, is_top_selling: true
      },
      {
        name: 'High-Speed 750W Mixer Grinder', category_id: catMap['kitchen-appliances'], product_type_id: ptMap['Mixer Grinder'],
        price: 3499, original_price: 4500, description: '750W Copper Motor 3-Jar Mixer Grinder with blades.', stock: 25, is_new_arrival: true
      },
      {
        name: '6-Seater Solid Oak Dining Table', category_id: catMap['furniture'], product_type_id: ptMap['Dining Table'],
        price: 32000, original_price: 40000, description: '6-Seater Solid Wood Dark Oak Dining Table with cushioned chairs.', stock: 3, is_new_arrival: true
      }
    ];
    await Product.insertMany(prodData);

    console.log('🌱 Seeding banners...');
    const bannerData = [
      { title: 'Divine Cooling: Refrigerators', subtitle: 'Experience freshness with the latest energy-efficient tech.', button_text: 'Shop Now', button_link: '/lists.html?category=refrigerators', bg_color_class: 'gold-grad', sort_order: 1 },
      { title: 'Furniture Collection', subtitle: 'Crafted for comfort, designed for your legacy.', button_text: 'Explore Designs', button_link: '/lists.html?category=furniture', bg_color_class: 'teal', sort_order: 2 },
      { title: 'Washing Machines Starting ₹15,000', subtitle: 'Smart cleaning for the modern Indian household.', button_text: 'View Deals', button_link: '/lists.html?category=washing-machines', bg_color_class: 'crimson-gold', sort_order: 3 }
    ];
    await Banner.insertMany(bannerData);

    console.log('🌱 Seeding offers...');
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    await Offer.create({
      title: 'Festive Season Sale', description: 'Up to 25% off on all furniture items this festive season!',
      discount_percentage: 25.00, start_date: today, end_date: nextMonth
    });

    console.log('\n✨ Database ready! You can now start the server with: npm start');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

init();
