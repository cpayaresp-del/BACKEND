const path = require('path');
const fs = require('fs');
let firebaseAdmin = null;

// Verificar si firebase-admin está instalado
try {
  const admin = require('firebase-admin');
  
  // Ruta al archivo de credenciales de Firebase
  const firebaseKeyPath = path.join(__dirname, '../../firebaseKey.json');

  // Inicializar Firebase Admin SDK
  try {
    // DEBUG: Mostrar qué se está buscando
    console.log('🔍 Buscando credenciales de Firebase...');
    console.log('   FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? 'PRESENTE' : 'NO PRESENTE');
    console.log('   GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'PRESENTE' : 'NO PRESENTE');
    console.log('   firebaseKey.json existe:', fs.existsSync(firebaseKeyPath) ? 'SÍ' : 'NO');

    // Opción 1: Si usas FIREBASE_SERVICE_ACCOUNT en variables de entorno (Render.com)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        console.log('✅ Intentando inicializar con FIREBASE_SERVICE_ACCOUNT...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Firebase inicializado con FIREBASE_SERVICE_ACCOUNT (env var)');
      } catch (parseError) {
        console.warn('❌ Error parseando FIREBASE_SERVICE_ACCOUNT:', parseError.message);
      }
    } 
    // Opción 2: Si usas GOOGLE_APPLICATION_CREDENTIALS en .env
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('✅ Intentando inicializar con GOOGLE_APPLICATION_CREDENTIALS...');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('✅ Firebase inicializado con GOOGLE_APPLICATION_CREDENTIALS');
    } 
    // Opción 3: Cargar manualmente desde firebaseKey.json (desarrollo local)
    else if (fs.existsSync(firebaseKeyPath)) {
      console.log('✅ Intentando inicializar con firebaseKey.json...');
      const serviceAccount = require(firebaseKeyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK inicializado con firebaseKey.json');
    } 
    else {
      console.warn('❌ No se encontró archivo de credenciales Firebase');
      console.warn('❌ Variables de entorno requeridas: FIREBASE_SERVICE_ACCOUNT o GOOGLE_APPLICATION_CREDENTIALS');
    }
    
    if (admin.apps && admin.apps.length > 0) {
      console.log('✅ Firebase Admin SDK listo para usar');
      firebaseAdmin = admin;
    } else {
      console.warn('⚠️ Firebase no inicializado - admin.apps vacío');
    }
  } catch (error) {
    console.warn('⚠️ Error inicializando Firebase:', error.message);
  }
} catch (error) {
  console.warn('⚠️ firebase-admin no está instalado. Para usar notificaciones push, ejecuta: npm install firebase-admin');
}

module.exports = firebaseAdmin;

