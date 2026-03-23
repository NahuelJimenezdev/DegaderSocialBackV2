// Test para ver si las comillas en .env causan problemas
const keyWithQuotes = '"AIzaSyDv8GgqpaFJEGt-O-jPBzRhJdzt8MpkofE"';
const keyWithoutQuotes = 'AIzaSyDv8GgqpaFJEGt-O-jPBzRhJdzt8MpkofE';

console.log('Key with quotes length:', keyWithQuotes.length);
console.log('Key without quotes length:', keyWithoutQuotes.length);

if (keyWithQuotes.startsWith('"') && keyWithQuotes.endsWith('"')) {
    console.log('⚠️ ALERTA: La clave contiene comillas literales.');
}
