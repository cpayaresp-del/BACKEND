const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'bodega', 'repartidor', 'user'], // user = cliente normal
      default: 'user',
    },
    address: {
      type: String,
      default: '',
    },
    neighborhood: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '', // ✅ agregado
    },
    fcmToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔐 Hash automático
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔐 Comparar password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🚫 No devolver password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);