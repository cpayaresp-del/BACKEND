const User = require('../models/user'); // ✅ IMPORTANTE: mayúscula

// 🔹 Crear usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, address } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      address: address || '',
    });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🔹 Listar usuarios
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Actualizar usuario (role y/o address)
const updateUser = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.role) updateData.role = req.body.role;
    if (req.body.address !== undefined) updateData.address = req.body.address;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

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
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🔹 Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'ok' }); // ✅ consistente con frontend
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
};