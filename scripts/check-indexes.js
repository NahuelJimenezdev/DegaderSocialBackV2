const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Message = require('../src/models/Message.model');

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    let result = { syncSuccess: false, syncError: null, indexes: [] };

    try {
      await Message.syncIndexes();
      result.syncSuccess = true;
    } catch (e) {
      result.syncError = e.message;
    }

    result.indexes = await mongoose.connection.db.collection('messages').indexes();
    fs.writeFileSync('index_debug.json', JSON.stringify(result, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    fs.writeFileSync('index_debug.json', JSON.stringify({ error: error.message }));
  }
}

checkIndexes();
