const { getUrlMetadata } = require('./src/services/urlMetadataService');

const testUrl = 'https://chat.whatsapp.com/HCOu3zlOT7HJ3XEx6DtiBo?mode=gi_t';

(async () => {
    console.log(`🔍 Testing metadata for: ${testUrl}`);
    const metadata = await getUrlMetadata(testUrl);
    console.log('✅ Result:', JSON.stringify(metadata, null, 2));
})();
