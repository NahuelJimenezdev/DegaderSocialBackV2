require('dotenv').config();
const mongoose = require('mongoose');

async function checkRealIndexes() {
    try {
        console.log('🔍 Conectando a MongoDB para verificación de índices REALES...');
        const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;
        await mongoose.connect(uri);

        const collection = mongoose.connection.db.collection('iglesias');
        const indexes = await collection.indexes();

        console.log('\n📊 ÍNDICES ENCONTRADOS EN COLECCIÓN "iglesias":');
        console.log(JSON.stringify(indexes, null, 2));

        // Verificación específica
        const uniquePastor = indexes.find(idx => idx.name === 'idx_church_unique_pastor');
        const uniqueNameCity = indexes.find(idx => idx.name === 'idx_church_unique_name_city');

        console.log('\n✅ VEREDICTO DE ÍNDICES:');
        
        if (uniquePastor && uniquePastor.unique) {
            console.log('✔️ idx_church_unique_pastor: OK (Unique)');
        } else {
            console.error('❌ idx_church_unique_pastor: FALLO O NO EXISTE');
        }

        if (uniqueNameCity && uniqueNameCity.unique && uniqueNameCity.collation) {
            console.log('✔️ idx_church_unique_name_city: OK (Unique + Collation)');
        } else {
            console.error('❌ idx_church_unique_name_city: FALLO O NO EXISTE');
        }

        if (uniqueNameCity && uniqueNameCity.collation?.locale === 'es' && uniqueNameCity.collation?.strength === 2) {
            console.log('✔️ Collation: OK (Locale es, Strength 2)');
        } else {
            console.error('❌ Collation: FALLO O INCORRECTA');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

checkRealIndexes();
