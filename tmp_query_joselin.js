const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ 
      $or: [
        { 'nombres.primero': { $regex: /josel/i } },
        { 'apellidos.primero': { $regex: /jimenez/i } }
      ]
    }).lean();
    
    if (!user) {
      const anyUser = await User.findOne({ 'fundacion.documentacionFHSYL.ocupacion': { $exists: true, $ne: "" } }).lean();
      if(anyUser) {
         fs.writeFileSync('tmp_output.json', JSON.stringify({email: anyUser.email, data: anyUser.fundacion}, null, 2), 'utf-8');
      }
    } else {
      fs.writeFileSync('tmp_output.json', JSON.stringify({email: user.email, data: user.fundacion}, null, 2), 'utf-8');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
