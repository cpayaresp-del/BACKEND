const User = require('../models/user');
const admin = require('../config/firebase');

// Guardar o actualizar el FCM token del usuario
const saveFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user?.id;

    if (!fcmToken || !userId) {
      return res.status(400).json({ message: 'FCM Token y User ID son requeridos' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'FCM Token guardado exitosamente', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Enviar notificación a todos los usuarios (excepto admin)
const sendNotificationToAll = async (req, res) => {
  try {
    // Validar que Firebase esté disponible
    if (!admin) {
      return res.status(503).json({ 
        message: 'Firebase no está configurado. Instala firebase-admin para usar notificaciones push.' 
      });
    }

    const { title, body, data = {} } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Título y cuerpo son requeridos' });
    }

    // Obtener todos los usuarios con FCM tokens (excepto admins)
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null },
      role: { $ne: 'admin' }
    });

    if (users.length === 0) {
      return res.status(200).json({ 
        message: 'No hay usuarios para notificar',
        sentCount: 0 
      });
    }

    let sentCount = 0;
    const failedUsers = [];

    // Enviar notificación a cada usuario
    for (const user of users) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          data,
          token: user.fcmToken,
        };

        await admin.messaging().send(message);
        sentCount++;
        console.log(`✅ Notificación enviada a ${user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando a ${user.email}:`, error);
        if (error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/invalid-argument') {
          await User.findByIdAndUpdate(user._id, { fcmToken: null });
          console.log(`🧹 Token inválido removido para ${user.email}`);
        }
        failedUsers.push(user.email);
      }
    }

    res.json({
      message: `Notificaciones enviadas: ${sentCount}/${users.length}`,
      sentCount,
      totalUsers: users.length,
      failedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Enviar notificación de producto en descuento
const sendDiscountNotification = async (req, res) => {
  try {
    // Validar que Firebase esté disponible
    if (!admin) {
      return res.status(503).json({ 
        message: 'Firebase no está configurado. Instala firebase-admin para usar notificaciones push.' 
      });
    }

    const { productId, productName, discountPercent, data = {} } = req.body;

    if (!productId || !productName || discountPercent === undefined) {
      return res.status(400).json({
        message: 'productId, productName y discountPercent son requeridos'
      });
    }

    const title = '🎉 ¡Producto en Descuento!';
    const body = `${productName} tiene un descuento del ${discountPercent}%`;
    const notificationData = {
      type: 'discount',
      productId,
      discountPercent: String(discountPercent),
      ...data,
    };

    // Obtener todos los usuarios con FCM tokens
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null },
      role: { $ne: 'admin' }
    });

    if (users.length === 0) {
      return res.status(200).json({
        message: 'No hay usuarios para notificar',
        sentCount: 0,
      });
    }

    let sentCount = 0;
    const failedUsers = [];

    // Enviar a todos
    for (const user of users) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          data: notificationData,
          token: user.fcmToken,
        };

        await admin.messaging().send(message);
        sentCount++;
        console.log(`✅ Notificación de descuento enviada a ${user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando descuento a ${user.email}:`, error);
        if (error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/invalid-argument') {
          await User.findByIdAndUpdate(user._id, { fcmToken: null });
          console.log(`🧹 Token inválido removido para ${user.email}`);
        }
        failedUsers.push(user.email);
      }
    }

    res.json({
      message: `Notificaciones de descuento enviadas: ${sentCount}/${users.length}`,
      sentCount,
      totalUsers: users.length,
      failedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Guardar FCM token anónimo (sin autenticación)
const saveFCMTokenAnonymous = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM Token es requerido' });
    }

    // Crear un email anónimo único basado en el token FCM
    const anonymousEmail = `anon_${fcmToken.substring(0, 20)}@daylishop.local`;

    // Buscar o crear usuario anónimo con este token
    let user = await User.findOne({ fcmToken });

    if (!user) {
      // Crear nuevo usuario anónimo
      user = await User.create({
        name: 'Usuario Anónimo',
        email: anonymousEmail,
        password: 'anonymous', // Contraseña dummy
        role: 'user', // Los usuarios anónimos son role 'user' (cliente normal)
        fcmToken,
      });
      console.log(`✅ Nuevo usuario anónimo creado con token FCM`);
    } else {
      // Actualizar token si ya existe
      user = await User.findByIdAndUpdate(
        user._id,
        { fcmToken },
        { new: true }
      );
      console.log(`🔄 Token FCM actualizado para usuario anónimo`);
    }

    res.json({ 
      message: 'FCM Token guardado exitosamente (anónimo)', 
      success: true 
    });
  } catch (error) {
    // Si es error de email duplicado, actualizar el existente
    if (error.code === 11000) {
      try {
        const { fcmToken } = req.body;
        await User.findOneAndUpdate(
          { fcmToken },
          { fcmToken },
          { new: true }
        );
        return res.json({ 
          message: 'FCM Token actualizado', 
          success: true 
        });
      } catch (updateError) {
        console.error('Error actualizando token:', updateError);
      }
    }
    
    console.error('Error guardando FCM token anónimo:', error);
    res.status(500).json({ message: 'Error guardando token' });
  }
};

module.exports = {
  saveFCMToken,
  saveFCMTokenAnonymous,
  sendNotificationToAll,
  sendDiscountNotification
};
