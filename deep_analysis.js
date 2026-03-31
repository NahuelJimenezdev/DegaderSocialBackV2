const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./src/models/User.model');

async function deepAnalyzeUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ 
            $or: [
                { 'nombres.primero': /Joselin/i },
                { 'apellidos.primero': /Jiménez/i }
            ]
        }).lean();

        if (!user) {
            console.log('User Joselin not found');
            return;
        }

        console.log('--- DEEP ANALYSIS: JOSELIN JIMÉNEZ ---');
        console.log('Full Name:', user.nombres.primero, user.apellidos.primero);
        console.log('User ID:', user._id);
        console.log('Account createdAt:', user.createdAt);
        console.log('Account updatedAt:', user.updatedAt);
        
        if (user.fundacion) {
            console.log('--- Fundacion Object ---');
            console.log('nivel:', user.fundacion.nivel);
            console.log('area:', user.fundacion.area);
            console.log('cargo:', user.fundacion.cargo);
            console.log('estadoAprobacion:', user.fundacion.estadoAprobacion);
            console.log('fechaIngreso:', user.fundacion.fechaIngreso);
            console.log('fechaSolicitud (NUEVO CAMPO):', user.fundacion.fechaSolicitud);
            console.log('fechaAprobacion:', user.fundacion.fechaAprobacion);
            console.log('historialCargos length:', user.fundacion.historialCargos?.length || 0);
        } else {
            console.log('fundacion object: MISSING');
        }

        console.log('--- Raw data for matching the "23:18 23/03/26" string ---');
        // Let's see if any other date matches
        const searchDate = "2026-03-23T23:18";
        // We look for any Date field that has this value
        for (const [key, value] of Object.entries(user)) {
            if (value instanceof Date && value.toISOString().startsWith("2026-03-23T23:18")) {
                console.log(`MATCH FOUND in root: ${key} = ${value.toISOString()}`);
            }
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error during deep analysis:', error);
        process.exit(1);
    }
}

deepAnalyzeUser();
