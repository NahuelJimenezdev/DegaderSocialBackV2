const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const Iglesia = require('./src/models/Iglesia');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const lg = await Iglesia.findOne({'galeria.1': {$exists: true}}).select('galeria galeriaObjs').lean();
    fs.writeFileSync('dump.json', JSON.stringify(lg, null, 2));
    process.exit(0);
});
