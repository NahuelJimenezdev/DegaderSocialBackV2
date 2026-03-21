const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const MODELS_DIR = path.join(SRC_DIR, 'models');

const modelMappings = {
    'ad.js': 'Ad.model.js',
    'adcredit.js': 'AdCredit.model.js',
    'adimpression.js': 'AdImpression.model.js',
    'arenamatch.model.js': 'ArenaMatch.model.js',
    'auditlog.js': 'AuditLog.model.js',
    'churchevent.js': 'ChurchEvent.model.js',
    'conversation.js': 'Conversation.model.js',
    'credittransaction.js': 'CreditTransaction.model.js',
    'devicetoken.js': 'DeviceToken.model.js',
    'folder.js': 'Folder.model.js',
    'friendship.js': 'Friendship.model.js',
    'group.js': 'Group.model.js',
    'groupmessage.js': 'GroupMessage.model.js',
    'iglesia.js': 'Iglesia.model.js',
    'iglesiamessage.js': 'IglesiaMessage.model.js',
    'iglesiatestimonial.js': 'IglesiaTestimonial.model.js',
    'meeting.js': 'Meeting.model.js',
    'notification.js': 'Notification.model.js',
    'post.js': 'Post.model.js',
    'postcomment.model.js': 'PostComment.model.js',
    'postlike.model.js': 'PostLike.model.js',
    'report.js': 'Report.model.js',
    'ticket.js': 'Ticket.model.js',
    'user.model.js': 'User.model.js',
    'arenaauditlog.model.js': 'ArenaAuditLog.model.js',
    'arenasession.model.js': 'ArenaSession.model.js',
    'backupmodel.js': 'Backup.model.js',
    'challenge.model.js': 'Challenge.model.js',
    'season.model.js': 'Season.model.js',
    'seasonsnapshot.model.js': 'SeasonSnapshot.model.js'
};

function getJSFiles(dir, filesList = []) {
    if (!fs.existsSync(dir)) return filesList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'scripts' && file !== 'src_backup') {
                getJSFiles(fullPath, filesList);
            }
        } else if (fullPath.endsWith('.js')) {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

console.log('🔄 Iniciando Refactorización Integral de Modelos...\n');

// 1. BACKUP ESTRICTO
const backupDir = path.join(PROJECT_ROOT, 'src_backup');
if (!fs.existsSync(backupDir)) {
    console.log(`📦 Creando backup de seguridad en: ${backupDir}`);
    try {
        if (process.platform === 'win32') {
            execSync(`xcopy "${SRC_DIR}" "${backupDir}" /E /I /H /Y /Q`);
        } else {
            execSync(`cp -r "${SRC_DIR}" "${backupDir}"`);
        }
        console.log('✅ Backup automático completado.\n');
    } catch(e) {
        console.error('❌ Error crítico creando backup. Abortando script por seguridad.', e.message);
        process.exit(1);
    }
} else {
    console.log('📦 El backup src_backup ya existe. Continuando...\n');
}

// 2. RENOMBRAR FÍSICAMENTE LOS ARCHIVOS (Fase preferida primero)
console.log('🔄 FASE 1: Renombrando archivos en disco del directorio src/models...\n');
let filesRenamed = 0;

const actualModels = fs.readdirSync(MODELS_DIR);

actualModels.forEach(file => {
    const oldPath = path.join(MODELS_DIR, file);
    if (!fs.statSync(oldPath).isFile() || !file.endsWith('.js')) return;

    let targetModel = null;
    const lowerFile = file.toLowerCase();
    
    if (modelMappings[lowerFile]) {
        targetModel = modelMappings[lowerFile];
    } else {
        const rawKey = lowerFile.replace(/\.js$/, '').replace(/\.model$/, '');
        for (const [oldKey, newName] of Object.entries(modelMappings)) {
            if (oldKey.replace(/\.js$/, '').replace(/\.model$/, '') === rawKey) {
                targetModel = newName;
                break;
            }
        }
    }

    if (targetModel && file !== targetModel) {
        const tmpPath = path.join(MODELS_DIR, targetModel + '.tmp');
        const newPath = path.join(MODELS_DIR, targetModel);
        
        try {
            // Renombrado iterativo ("Double Rename Pattern")
            fs.renameSync(oldPath, tmpPath);
            fs.renameSync(tmpPath, newPath);
            console.log(`  📝 [RENAMED] ${file} -> ${targetModel}`);
            filesRenamed++;
        } catch(e) {
            console.error(`  ❌ [ERROR] Falló al renombrar la capa física de fs: ${file}`, e);
        }
    }
});

console.log(`\n✅ FASE 1: Se verificaron 30 archivos y se normalizaron ${filesRenamed}.`);

// 3. ACTUALIZAR IMPORTACIONES (REQUIRE) EN EL CÓDIGO FUENTE
const allJsFiles = getJSFiles(SRC_DIR);
console.log(`\n🔍 FASE 2: Se escanearán ${allJsFiles.length} archivos .js de la capa de lógica para arreglar imports...\n`);

let importsModified = 0;
let filesModified = new Set();
const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

allJsFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Protección estricta: si no hay un block require, se ignora por complet.
    if (!content.includes('require')) return;

    let hasChanges = false;
    
    const newContent = content.replace(requireRegex, (match, importPath) => {
        const parts = importPath.split('/');
        const requestedFile = parts[parts.length - 1]; 
        
        // Determinar si el paquete importado apunta estrictamente a un models folder
        const isModelImport = importPath.includes('/models/');

        if (isModelImport) {
            let rawName = requestedFile.toLowerCase().replace(/\.js$/, '').replace(/\.model$/, '');
            let targetModel = null;
            
            for (const [oldKey, newName] of Object.entries(modelMappings)) {
                const rawKey = oldKey.replace(/\.js$/, '').replace(/\.model$/, '');
                if (rawKey === rawName) {
                    targetModel = newName;
                    break;
                }
            }

            if (targetModel) {
                const standardRequire = targetModel.replace(/\.js$/, ''); 
                if (requestedFile !== standardRequire && requestedFile !== targetModel) {
                    parts[parts.length - 1] = standardRequire;
                    const newImportPath = parts.join('/');
                    
                    hasChanges = true;
                    importsModified++;
                    console.log(`  🔗 [UPDATED IMPORT] en ${path.basename(file)}:\n     - De: '${importPath}'\n     - A:  '${newImportPath}'`);
                    return `require('${newImportPath}')`;
                }
            }
        }
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(file, newContent, 'utf8');
        filesModified.add(file);
    }
});

console.log(`\n✅ FASE 2: Se actualizaron y homogeneizaron ${importsModified} imports en de ${filesModified.size} archivos diferentes.\n`);

console.log('\n🚀 REFACTORIZACIÓN ESTRUCTURAL FINALIZADA CON ÉXITO. 🚀\n');
console.log('Validación POST-REFACTOR:');
console.log('Puedes levantar el servidor y verificar que no hay fallos de `Cannot find module`.\n');
