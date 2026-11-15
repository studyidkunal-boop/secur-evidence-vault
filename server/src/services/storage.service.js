const supabase = require('../config/supabase');
const env = require('../config/env');

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || env.SUPABASE_BUCKET_NAME || 'evidence-vault-private';

// In-memory fallback mock storage store when cloud credentials are not provided
const mockStorageStore = new Map();

function isCloudConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_URL.includes('your-project')
  );
}

/**
 * Uploads a file buffer directly to Supabase Storage private bucket
 * 
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} storagePath - Destination path in private bucket
 * @param {string} mimeType - File MIME content type
 * @returns {Promise<{ storagePath: string, size: number }>}
 */
async function uploadFile(buffer, storagePath, mimeType) {
  if (isCloudConfigured()) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist yet, attempt creation and retry once
      if (error.statusCode === '404' || error.message?.includes('not found')) {
        await supabase.storage.createBucket(BUCKET_NAME, { public: false });
        const retry = await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });
        if (retry.error) {
          throw new Error(`Supabase storage upload failed: ${retry.error.message}`);
        }
        return { storagePath, size: buffer.length };
      }
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return { storagePath, size: buffer.length };
  }

  // Fallback for offline testing
  mockStorageStore.set(storagePath, {
    buffer: Buffer.from(buffer),
    mimeType,
    uploadedAt: new Date(),
  });

  return { storagePath, size: buffer.length };
}

/**
 * Downloads a file buffer from Supabase Storage private bucket
 * 
 * @param {string} storagePath - Path in storage bucket
 * @returns {Promise<Buffer>}
 */
async function downloadFile(storagePath) {
  if (isCloudConfigured()) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (error) {
      throw new Error(`Supabase storage download failed: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const stored = mockStorageStore.get(storagePath);
  if (!stored) {
    throw new Error(`Artifact not found in mock storage: ${storagePath}`);
  }

  return Buffer.from(stored.buffer);
}

module.exports = {
  uploadFile,
  downloadFile,
  mockStorageStore,
  isCloudConfigured,
};
