const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

// POST /api/admin/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await AdminUser.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, username: user.username, message: 'Login successful' });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/logout (stateless - client drops token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// POST /api/admin/change-password
const adminAuth = require('../middleware/auth');
router.post('/change-password', adminAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/;
    if (!current_password || !new_password || !strongPassword.test(new_password)) {
      return res.status(400).json({
        error: 'New password must be at least 10 characters and include a letter, number, and special character.'
      });
    }

    const user = await AdminUser.findById(req.admin.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    user.password_hash = hash;
    await user.save();
    
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
