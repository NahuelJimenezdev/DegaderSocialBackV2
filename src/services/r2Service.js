const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const r2Client = require('../config/r2');
const crypto = require('crypto');
const path = require('path');

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const uploadToR2 = async (fileBuffer, originalName, folder = 'uploads') => {
  try {
    const fileExtension = path.extname(originalName);
    const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const contentType = getContentType(fileExtension);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);
    return `${PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error('Error al subir archivo a R2:', error);
    throw new Error('Error al subir archivo');
  }
};

const deleteFromR2 = async (fileUrl) => {
  try {
    const key = fileUrl.replace(`${PUBLIC_URL}/`, '');
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
  } catch (error) {
    console.error('Error al eliminar archivo de R2:', error);
    throw new Error('Error al eliminar archivo');
  }
};

function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = { uploadToR2, deleteFromR2 };
