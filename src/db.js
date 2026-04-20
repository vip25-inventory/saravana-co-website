const mongoose = require('mongoose');

mongoose.set('toJSON', { virtuals: true });
mongoose.set('toObject', { virtuals: true });

async function connectDB(retries = 5) {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      autoIndex: false,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB Connection Error:', err);

    if (retries > 0) {
      console.log(`Retrying... (${retries})`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      process.exit(1);
    }
  }
}

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

module.exports = { connectDB, mongoose };