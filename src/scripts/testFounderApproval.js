require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const USER_ID = '6930dbc5d78b11c2d6d6d683';
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function testFounderApprovalFlow() {
  try {
    console.log(`🚀 Iniciando Simulación de Flujo Founder en ${BASE_URL}`);

    // 1. Generar Token
    const token = jwt.sign({ userId: USER_ID }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('🔑 Token generado.');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Obtener Campañas Pendientes
    console.log('\n📡 Solicitando campañas pendientes...');
    const listRes = await axios.get(`${BASE_URL}/ads/admin/all-campaigns?estado=pendiente_aprobacion`, { headers });

    // Ajuste por la estructura de respuesta que puede variar
    const campaigns = listRes.data.campaigns || listRes.data.data || [];
    console.log(`📊 Encontradas ${campaigns.length} campañas pendientes.`);

    if (campaigns.length === 0) {
      console.log('⚠️ No hay campañas pendientes para aprobar. Test finalizado.');

      // Listar todas para ver qué hay
      console.log('🔍 Listando TODAS las campañas para diagnóstico:');
      const allRes = await axios.get(`${BASE_URL}/ads/admin/all-campaigns`, { headers });
      const allCampaigns = allRes.data.campaigns || allRes.data.data || [];
      allCampaigns.forEach(c => console.log(`- [${c.estado}] ${c.nombreCliente} (ID: ${c._id})`));
      return;
    }

    // 3. Seleccionar la primera para aprobar
    const targetAd = campaigns[0];
    console.log(`\n🎯 Objetivo seleccionado: "${targetAd.nombreCliente}" (ID: ${targetAd._id})`);

    // 4. Ejecutar Aprobación
    console.log(`📡 Enviando solicitud de APROBACIÓN...`);
    const approveRes = await axios.put(
      `${BASE_URL}/ads/admin/approve/${targetAd._id}`,
      { accion: 'aprobar' },
      { headers }
    );

    console.log(`✅ Respuesta API: ${approveRes.status} ${approveRes.statusText}`);
    console.log(`📦 Datos actualizados:`, approveRes.data);

    // 5. Verificación Final
    if (approveRes.data.estado === 'activo') {
      console.log('\n✨ ¡ÉXITO! La campaña ha sido aprobada correctamente.');
    } else {
      console.log('\n⚠️ ADVERTENCIA: La campaña no parece haber cambiado a estado "activo".');
    }

  } catch (error) {
    console.error('❌ Error en el flujo:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

testFounderApprovalFlow();
