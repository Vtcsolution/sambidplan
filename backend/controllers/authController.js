// backend/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import AdminNotification from '../models/admin/AdminNotification.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, businessName, naicsCodes, businessType } = req.body;
    
    console.log('📝 Registration attempt:', { name, email, businessName });
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists. Please login instead.' 
      });
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      businessName: businessName || '',
      naicsCodes: naicsCodes || [],
      businessType: businessType || 'other'
    });
    
    console.log(`✅ User created: ${email}`);
    
    // Create notification for admin
    try {
      await AdminNotification.create({
        title: 'New User Registered',
        message: `${user.name || user.email} created a new account`,
        type: 'user_signup',
        actionRequired: false,
        priority: 'medium',
        metadata: {
          userId: user._id,
          userEmail: user.email,
          userPlan: user.plan,
          businessName: user.businessName || 'Not provided'
        }
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError.message);
    }
    
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists. Please use a different email.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Registration failed. Please try again.' 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔐 Login attempt: ${email}`);
    
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    console.log(`✅ User logged in: ${email}`);
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName || '',
        plan: user.plan,
        role: user.role || 'user',
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { businessName, naicsCodes, businessType } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (businessName) user.businessName = businessName;
    if (naicsCodes) user.naicsCodes = naicsCodes;
    if (businessType) user.businessType = businessType;
    
    await user.save();
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};