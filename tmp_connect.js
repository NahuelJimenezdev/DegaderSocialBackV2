const mongoose = require('mongoose');

// El URI de Atlas tiene los hostnames
const uri = "mongodb://degaderUser:DegaderSocial@89.192.9.237:27017,89.192.9.252:27017,89.192.10.9:27017/degader?replicaSet=atlas-3ts5dmr-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&tlsAllowInvalidHostnames=true&tlsAllowInvalidCertificates=true";

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000
}).then(async () => {
  const User = require('./src/models/User.model');
  
  // 1. Joselin
  const joselin = await User.findOne({ email: 'joselinjimenezmoreno@gmail.com' }).lean();
  
  // 2. Todos
  const todos = await User.find({}).lean();
  
  const fs = require('fs');
  fs.writeFileSync('audit_joselin.json', JSON.stringify(joselin, null, 2));
  fs.writeFileSync('audit_todos.json', JSON.stringify(todos.map(u => ({
    email: u.email,
    fundacion: u.fundacion,
    esMiembro: u.esMiembroFundacion,
    cargo: u.fundacion?.cargo,
    nivel: u.fundacion?.nivel,
    pais: u.fundacion?.territorio?.pais
  })), null, 2));
  
  console.log('✅ Base de datos leída exitosamente.');
  process.exit(0);
}).catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
