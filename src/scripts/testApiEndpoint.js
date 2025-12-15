require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const USER_ID = '6930dbc5d78b11c2d6d6d683';
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function testApi() {
  try {
    console.log(`🚀 Iniciando prueba de API en ${BASE_URL}`);

    // 1. Generar Token
    const token = jwt.sign({ userId: USER_ID }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
    console.log('🔑 Token generado correctamente.');

    // 2. Probar Endpoint Admin
    console.log('\n📡 Solicitando GET /ads/admin/all-campaigns ...');

    try {
      const response = await axios.get(`${BASE_URL}/ads/admin/all-campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ Respuesta recibida! Status: ${response.status}`);
      console.log('📦 Datos:', JSON.stringify(response.data, null, 2));

    } catch (apiError) {
      if (apiError.response) {
        console.log(`❌ Error API: ${apiError.response.status} - ${apiError.response.statusText}`);
        console.log('Datos Error:', apiError.response.data);
      } else {
        console.log('❌ Error de conexión:', apiError.code || apiError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testApi();
