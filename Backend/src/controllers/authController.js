const jwt = require('jsonwebtoken');
const User = require('../models/user'); // ⚠️ minúscula porque tu archivo es user.js

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, address, neighborhood, city, phone, fcmToken } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Este correo ya está registrado. Ingrese con este correo o use otra dirección de correo.' });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ message: 'Este número de teléfono ya está registrado. Ingrese con el correo asociado o use otro número.' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      address: address || '', 
      neighborhood: neighborhood || '',
      city: city || '',
      phone: phone || '',
      fcmToken: fcmToken || null,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        neighborhood: user.neighborhood,
        city: user.city,
        phone: user.phone,
        fcmToken: user.fcmToken,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        neighborhood: user.neighborhood,
        city: user.city,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Obtener usuario actual
const getMe = async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      address: req.user.address,
      neighborhood: req.user.neighborhood,
      city: req.user.city,
      phone: req.user.phone,
    },
  });
};

// 🔹 Actualizar perfil (dirección)
const updateProfile = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.address !== undefined) {
      updateData.address = req.body.address;
    }

    if (req.body.neighborhood !== undefined) {
      updateData.neighborhood = req.body.neighborhood;
    }

    if (req.body.city !== undefined) {
      updateData.city = req.body.city;
    }

    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password'); // ✅ nunca devolver password

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        neighborhood: user.neighborhood,
        city: user.city,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};