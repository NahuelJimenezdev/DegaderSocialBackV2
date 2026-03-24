require('dotenv').config();
const mongoose = require('mongoose');

// Configuración de conexión
const DB_CLUSTER = process.env.DB_CLUSTER || 'cluster0.pcisms7.mongodb.net';
const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

async function runAudit(clean = false) {
    try {
        console.log(`🚀 Iniciando auditoría de iglesias (Modo: ${clean ? 'LIMPUEZA' : 'SOLO REPORTE'})...`);
        await mongoose.connect(MONGO_URI);

        const collection = mongoose.connection.db.collection('iglesias');

        // 1. Buscar duplicados por Nombre + Ciudad
        console.log('\n--- 1. Duplicados por Nombre y Ciudad ---');
        const duplicatesByName = await collection.aggregate([
            {
                $group: {
                    _id: { nombre: { $toLower: "$nombre" }, ciudad: { $toLower: "$ubicacion.ciudad" } },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" },
                    nombres: { $addToSet: "$nombre" }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        if (duplicatesByName.length === 0) {
            console.log('✅ No se encontraron duplicados por nombre y ciudad.');
        } else {
            console.warn(`⚠️ Se encontraron ${duplicatesByName.length} grupos de duplicados.`);
            for (const group of duplicatesByName) {
                console.log(`   - Grupo: "${group.nombres[0]}" en "${group._id.ciudad}" (${group.count} registros)`);
                if (clean) {
                    const [keep, ...remove] = group.ids;
                    const res = await collection.deleteMany({ _id: { $in: remove } });
                    console.log(`   ✨ Eliminados ${res.deletedCount} duplicados. Mantenido ID: ${keep}`);
                }
            }
        }

        // 2. Buscar pastores con múltiples iglesias activas
        console.log('\n--- 2. Pastores con Múltiples Iglesias ---');
        const duplicatesByPastor = await collection.aggregate([
            { $match: { activo: true } },
            {
                $group: {
                    _id: "$pastorPrincipal",
                    count: { $sum: 1 },
                    churches: { $push: { id: "$_id", nombre: "$nombre" } }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        if (duplicatesByPastor.length === 0) {
            console.log('✅ No hay pastores con iglesias duplicadas.');
        } else {
            console.warn(`⚠️ Se encontraron ${duplicatesByPastor.length} pastores con más de una iglesia.`);
            for (const group of duplicatesByPastor) {
                console.log(`   - Pastor ID: ${group._id} tiene ${group.count} iglesias:`);
                group.churches.forEach(c => console.log(`     * [${c.id}] ${c.nombre}`));
                
                if (clean) {
                    // Mantener la más antigua (asumiendo que los IDs de Mongo son cronológicos o que el primer resultado es el más viejo)
                    const [keep, ...remove] = group.churches.map(c => c.id);
                    const res = await collection.deleteMany({ _id: { $in: remove } });
                    console.log(`   ✨ Eliminadas ${res.deletedCount} iglesias excedentes para este pastor. Mantenida: ${keep}`);
                }
            }
        }

        console.log('\n✅ Auditoría finalizada.');

    } catch (error) {
        console.error('❌ Error durante la auditoría:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Ejecución
const args = process.argv.slice(2);
const cleanMode = args.includes('--clean');
runAudit(cleanMode);
