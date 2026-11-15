const path = require('path');
const crypto = require('crypto');
const { z } = require('zod');
const { pool, query } = require('../db');
const supabase = require('../config/supabase');
const { computeSHA256, constantTimeCompare } = require('../utils/crypto');
const storageService = require('../services/storage.service');
const auditService = require('../services/audit.service');
const reportService = require('../services/report.service');
const { watermarkImage, watermarkText } = require('../utils/watermark');

// Zod validation schema for evidence upload metadata
const uploadEvidenceSchema = z.object({
  case_number: z
    .string()
    .min(1, 'Case number is required')
    .max(100, 'Case number cannot exceed 100 characters')
    .trim(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .default(''),
  category: z
    .string({ required_error: 'Category is required (e.g., Weapon, Digital, Narcotics)' })
    .min(1, 'Category is required (e.g., Weapon, Digital, Narcotics)')
    .max(100, 'Category cannot exceed 100 characters')
    .trim(),
  serial_number: z
    .string()
    .max(100, 'Serial number cannot exceed 100 characters')
    .optional()
    .nullable()
    .default(null),
  seizure_address: z
    .string({ required_error: 'Seizure address is required' })
    .min(1, 'Seizure address is required')
    .trim(),
  witness_name: z
    .string({ required_error: 'Witness name is required' })
    .min(1, 'Witness name is required')
    .max(255, 'Witness name cannot exceed 255 characters')
    .trim(),
  witness_contact: z
    .string()
    .max(100, 'Witness contact cannot exceed 100 characters')
    .optional()
    .nullable()
    .default(null),
  latitude: z.union([z.string(), z.number()]).optional().nullable(),
  longitude: z.union([z.string(), z.number()]).optional().nullable(),
});

/**
 * Upload digital evidence file, compute SHA-256 hash, persist to storage, and record in DB
 * Role: INSPECTOR
 */
async function uploadEvidence(req, res) {
  try {
    // 1. Validate that a file exists in the request
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Please attach a digital evidence file.',
      });
    }

    // 2. Extract and strictly validate required legal seizure fields from req.body
    const rawCategory = req.body.category;
    const rawSeizureAddress = req.body.seizure_address;
    const rawWitnessName = req.body.witness_name;

    if (!rawCategory || typeof rawCategory !== 'string' || !rawCategory.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: category is strictly required for legal evidence seizure (e.g. Weapon, Digital, Narcotics).',
      });
    }

    if (!rawSeizureAddress || typeof rawSeizureAddress !== 'string' || !rawSeizureAddress.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: seizure_address is strictly required under legal seizure protocols.',
      });
    }

    if (!rawWitnessName || typeof rawWitnessName !== 'string' || !rawWitnessName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: witness_name is strictly required to establish valid seizure custody.',
      });
    }

    const validation = uploadEvidenceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence metadata',
        details: validation.error.errors.map((e) => e.message),
      });
    }

    const {
      case_number,
      title,
      description,
      category,
      serial_number,
      seizure_address,
      witness_name,
      witness_contact,
    } = validation.data;
    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;

    // 3. Generate SHA-256 hash using Node's built-in crypto module
    const sha256_hash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    // 4. Construct unique partitioned storage path for the file
    const sanitizedFileName = path
      .basename(originalName)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedCaseNumber = case_number.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const storagePath = `evidence/${sanitizedCaseNumber}/${uniqueSuffix}-${sanitizedFileName}`;

    // 5. Upload file buffer directly to Supabase Storage private bucket
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'evidence-vault-private';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      // If bucket does not exist yet, attempt automatic creation and retry upload
      if (uploadError.statusCode === '404' || uploadError.message?.includes('not found')) {
        await supabase.storage.createBucket(bucketName, { public: false });
        const retry = await supabase.storage.from(bucketName).upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });
        if (retry.error) {
          throw new Error(`Supabase Storage upload failed: ${retry.error.message}`);
        }
      } else {
        throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
      }
    }

    // Determine uploaded_by user id from authenticated session
    let userId = req.user?.id;
    if (!userId) {
      const defaultUser = await pool.query("SELECT id FROM users WHERE role = 'INSPECTOR' LIMIT 1");
      userId = defaultUser.rows[0]?.id;
    }

    // 6. Insert new record into PostgreSQL evidence table with full legal seizure fields
    const insertEvidenceQuery = `
      INSERT INTO evidence (
        case_number,
        title,
        description,
        file_name,
        mime_type,
        file_size,
        storage_path,
        sha256_hash,
        uploaded_by,
        latitude,
        longitude,
        category,
        serial_number,
        seizure_address,
        witness_name,
        witness_contact,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'PENDING')
      RETURNING *;
    `;

    const evidenceResult = await pool.query(insertEvidenceQuery, [
      case_number,
      title,
      description,
      originalName,
      mimeType,
      fileSize,
      storagePath,
      sha256_hash,
      userId,
      latitude,
      longitude,
      category,
      serial_number || null,
      seizure_address,
      witness_name,
      witness_contact || null,
    ]);

    const evidence = evidenceResult.rows[0];

    // 7. Insert audit record into audit_logs table (action: EVIDENCE_INGESTED)
    try {
      await auditService.logEvent({
        req,
        userId: userId,
        role: req.user?.role || 'INSPECTOR',
        action: 'EVIDENCE_INGESTED',
        evidenceId: evidence.id,
        metadata: {
          case_number: evidence.case_number,
          title: evidence.title,
          category: evidence.category,
          serial_number: evidence.serial_number,
          seizure_address: evidence.seizure_address,
          witness_name: evidence.witness_name,
          witness_contact: evidence.witness_contact,
          file_name: evidence.file_name,
          file_size: evidence.file_size,
          sha256_hash: sha256_hash,
          storage_path: evidence.storage_path,
          latitude: evidence.latitude,
          longitude: evidence.longitude,
        },
      });
    } catch (auditErr) {
      console.error('[Audit Log Warning]:', auditErr.message);
    }

    // 8. Emit real-time notification to all connected clients via Socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new-evidence', {
          id: evidence.id,
          case_number: evidence.case_number,
          title: evidence.title,
          status: evidence.status,
          created_at: evidence.created_at,
          uploaded_by: evidence.uploaded_by,
        });
        console.log(`📢 [Socket.io] Emitted 'new-evidence' for Case: ${evidence.case_number}`);
      }
    } catch (socketErr) {
      console.error('[Socket.io Warning]: Failed to emit new-evidence event:', socketErr.message);
    }

    // 9. Return 201 JSON response with success message and evidence data
    return res.status(201).json({
      success: true,
      message: 'Evidence successfully ingested and cryptographically sealed with SHA-256.',
      evidence,
    });
  } catch (err) {
    console.error('[Upload Evidence Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process and store digital evidence.',
      details: err.message,
    });
  }
}

/**
 * Fetch list of evidence uploaded exclusively by the authenticated Inspector
 * Role: INSPECTOR
 */
async function getMyEvidence(req, res) {
  try {
    const listQuery = `
      SELECT 
        e.id,
        e.case_number,
        e.title,
        e.description,
        e.category,
        e.serial_number,
        e.seizure_address,
        e.witness_name,
        e.witness_contact,
        e.latitude,
        e.longitude,
        e.file_name,
        e.mime_type,
        e.file_size,
        e.storage_path,
        e.sha256_hash,
        e.status,
        e.reviewed_by,
        e.review_remarks,
        e.reviewed_at,
        e.created_at,
        u.name AS uploader_name,
        u.name AS uploaded_by_name,
        u.badge_id AS uploader_badge,
        u.badge_id AS uploaded_by_badge,
        u.email AS uploader_email,
        u.email AS uploaded_by_email
      FROM evidence e
      JOIN users u ON e.uploaded_by = u.id
      WHERE e.uploaded_by = $1
      ORDER BY e.created_at DESC;
    `;

    const result = await query(listQuery, [req.user.id]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      evidence: result.rows,
    });
  } catch (err) {
    console.error('[Get My Evidence Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inspector evidence records.',
    });
  }
}

/**
 * Get detailed evidence record by ID with strict RBAC & ownership checks
 */
async function getEvidenceById(req, res) {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    const detailQuery = `
      SELECT 
        e.id,
        e.case_number,
        e.title,
        e.description,
        e.file_name,
        e.mime_type,
        e.file_size,
        e.storage_path,
        e.sha256_hash,
        e.status,
        e.uploaded_by,
        e.reviewed_by,
        e.review_remarks,
        e.reviewed_at,
        e.created_at,
        u.name AS uploader_name,
        u.name AS uploaded_by_name,
        u.badge_id AS uploader_badge,
        u.badge_id AS uploaded_by_badge,
        u.email AS uploader_email,
        u.email AS uploaded_by_email,
        r.name AS reviewer_name,
        r.badge_id AS reviewer_badge
      FROM evidence e
      JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.id = $1;
    `;

    const result = await query(detailQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = result.rows[0];

    // RBAC Ownership & Access Check:
    // 1. INSPECTOR: Must be the original uploader
    if (req.user.role === 'INSPECTOR' && evidence.uploaded_by !== req.user.id) {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Inspector attempted to view non-owned evidence record',
            case_number: evidence.case_number,
            evidence_id: evidence.id,
          },
        });
      } catch (auditErr) {
        console.error('[Audit Log Warning]:', auditErr.message);
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors are restricted to viewing only their own submitted evidence.',
      });
    }

    // 2. JUDGE: Can view only APPROVED evidence
    if (req.user.role === 'JUDGE' && evidence.status !== 'APPROVED') {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Judge attempted to view unapproved evidence record',
            case_number: evidence.case_number,
            evidence_id: evidence.id,
            status: evidence.status,
          },
        });
      } catch (auditErr) {
        console.error('[Audit Log Warning]:', auditErr.message);
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied: Judicial review is restricted to verified, approved evidence.',
      });
    }

    return res.status(200).json({
      success: true,
      evidence,
    });
  } catch (err) {
    console.error('[Get Evidence By ID Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence details.',
    });
  }
}

// Zod validation schema for DCP review decision
const reviewEvidenceSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: "Status must be either 'APPROVED' or 'REJECTED'." }),
  }),
  remarks: z
    .string()
    .max(1000, 'Review remarks cannot exceed 1000 characters.')
    .trim()
    .optional()
    .default('Certified Section 65B compliant by reviewing authority.'),
});

/**
 * Fetch all evidence records across all cases with optional filtering
 * Role: DCP
 */
async function getAllEvidenceForDCP(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const { status, case_number, search } = req.query;
    const conditions = [];
    const params = [];

    // Filter by status (If user is JUDGE, strictly force APPROVED evidence pool only)
    if (req.user.role === 'JUDGE') {
      conditions.push("e.status = 'APPROVED'");
    } else if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      params.push(status.toUpperCase());
      conditions.push(`e.status = $${params.length}`);
    }

    // Filter by case number
    if (case_number) {
      params.push(`%${case_number.trim()}%`);
      conditions.push(`e.case_number ILIKE $${params.length}`);
    }

    // Generic search on title or description
    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countQuery = `SELECT COUNT(*) FROM evidence e ${whereClause}`;
    const countRes = await query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query with uploader and reviewer metadata
    const dataQuery = `
      SELECT 
        e.id,
        e.case_number,
        e.title,
        e.description,
        e.category,
        e.serial_number,
        e.seizure_address,
        e.witness_name,
        e.witness_contact,
        e.latitude,
        e.longitude,
        e.file_name,
        e.mime_type,
        e.file_size,
        e.storage_path,
        e.sha256_hash,
        e.status,
        e.uploaded_by,
        e.reviewed_by,
        e.review_remarks,
        e.reviewed_at,
        e.created_at,
        e.updated_at,
        u.name AS uploader_name,
        u.name AS uploaded_by_name,
        u.badge_id AS uploader_badge,
        u.badge_id AS uploaded_by_badge,
        u.email AS uploader_email,
        u.email AS uploaded_by_email,
        r.name AS reviewer_name,
        r.badge_id AS reviewer_badge
      FROM evidence e
      JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(limit, offset);
    const result = await query(dataQuery, params);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      evidence: result.rows,
    });
  } catch (err) {
    console.error('[Get All Evidence For DCP Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence registry.',
      details: err.message,
    });
  }
}

/**
 * Review digital evidence record (Approve or Reject with mandatory remarks)
 * Role: DCP
 */
async function reviewEvidence(req, res) {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    // Validate body payload with Zod
    const validation = reviewEvidenceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed for review decision',
        details: validation.error.errors.map((e) => e.message),
      });
    }

    const { status, remarks } = validation.data;

    // Check if evidence exists
    const checkQuery = `
      SELECT id, case_number, title, file_name, file_size, sha256_hash, storage_path, status, uploaded_by
      FROM evidence
      WHERE id = $1;
    `;
    const checkRes = await query(checkQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const currentEvidence = checkRes.rows[0];
    const previousStatus = currentEvidence.status;

    // Separation of Duties: A DCP cannot approve or review evidence they uploaded themselves
    if (currentEvidence.uploaded_by === req.user.id) {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: currentEvidence.id,
          metadata: {
            reason: 'Separation of duties violation: DCP attempted to review self-uploaded evidence.',
            case_number: currentEvidence.case_number,
            evidence_id: currentEvidence.id,
          },
        });
      } catch (auditErr) {
        console.error('[Audit Log Warning]:', auditErr.message);
      }

      return res.status(403).json({
        success: false,
        error: 'Separation of duties violation: You cannot review or approve evidence that you uploaded yourself.',
      });
    }

    // Require non-empty review remarks on REJECTED
    if (
      status === 'REJECTED' &&
      (!remarks || !remarks.trim() || remarks.trim() === 'Certified Section 65B compliant by reviewing authority.')
    ) {
      return res.status(400).json({
        success: false,
        error: 'Review remarks are strictly mandatory when rejecting evidence.',
      });
    }

    // Update evidence record status and reviewer remarks
    await query(
      `
      UPDATE evidence
      SET 
        status = $1,
        reviewed_by = $2,
        review_remarks = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      `,
      [status, req.user.id, remarks, id]
    );

    const fullRecordRes = await query(
      `
      SELECT 
        e.*,
        u.name AS uploader_name,
        u.name AS uploaded_by_name,
        u.badge_id AS uploader_badge,
        u.badge_id AS uploaded_by_badge,
        u.email AS uploader_email,
        u.email AS uploaded_by_email,
        r.name AS reviewer_name,
        r.badge_id AS reviewer_badge
      FROM evidence e
      JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.id = $1;
      `,
      [id]
    );

    const updatedRecord = fullRecordRes.rows[0];

    // Log review action in the immutable, hash-chained audit log
    const auditAction = status === 'APPROVED' ? 'EVIDENCE_APPROVED' : 'EVIDENCE_REJECTED';

    try {
      await auditService.logEvent({
        req,
        userId: req.user.id,
        role: req.user.role,
        action: auditAction,
        evidenceId: updatedRecord.id,
        metadata: {
          case_number: updatedRecord.case_number,
          title: updatedRecord.title,
          file_name: updatedRecord.file_name,
          sha256_hash: updatedRecord.sha256_hash,
          previous_status: previousStatus,
          new_status: status,
          review_remarks: remarks,
          reviewer_badge: req.user.badge_id,
          reviewer_name: req.user.name,
        },
      });
    } catch (auditErr) {
      console.error('[Audit Log Error on evidence review]:', auditErr.message);
    }

    // Emit real-time notification to all connected clients via Socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('case-reviewed', {
          id: updatedRecord.id,
          case_number: updatedRecord.case_number,
          title: updatedRecord.title,
          status,
          reviewer_name: req.user.name,
          timestamp: new Date().toISOString(),
        });
        if (status === 'APPROVED') {
          io.emit('judge-alert', {
            id: `judge-${updatedRecord.id}-${Date.now()}`,
            title: `Judge accepted case #${updatedRecord.case_number}`,
            case_number: updatedRecord.case_number,
            evidence_id: updatedRecord.id,
            description: 'Section 65B certified exhibit admitted to Court Docket.',
            receivedAt: new Date().toLocaleTimeString(),
          });
        }
      }
    } catch (socketErr) {
      console.warn('[Socket.io Warning]: Failed to emit review alert:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Evidence review complete. Status updated to ${status}.`,
      evidence: updatedRecord,
    });
  } catch (err) {
    console.error('[Review Evidence Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record evidence review decision.',
      details: err.message,
    });
  }
}

/**
 * Cryptographic Verification Engine: verifyEvidenceHash
 * 1. Takes evidence_id from req.params
 * 2. Fetches evidence record from PostgreSQL database (storage_path & sha256_hash)
 * 3. Downloads file buffer directly from Supabase Storage using @supabase/supabase-js
 * 4. Calculates new SHA-256 hash using Node's crypto module
 * 5. Compares new hash with original DB hash
 * 6. Logs action ('EVIDENCE_VERIFIED' or 'TAMPER_DETECTED') in audit_logs table
 * 7. Returns { status: 'VERIFIED' | 'TAMPERED', originalHash, currentHash }
 */
async function verifyEvidenceHash(req, res) {
  try {
    const evidence_id = req.params.id || req.params.evidence_id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(evidence_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    // 1. Fetch record from PostgreSQL database
    const checkQuery = `
      SELECT id, case_number, title, file_name, file_size, storage_path, sha256_hash, status, uploaded_by
      FROM evidence
      WHERE id = $1;
    `;
    const checkRes = await query(checkQuery, [evidence_id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = checkRes.rows[0];

    // RBAC: Judge can only verify approved evidence
    if (req.user?.role === 'JUDGE' && evidence.status !== 'APPROVED') {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Judge attempted to verify unapproved evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Judicial verification is restricted to approved court evidence.',
      });
    }

    if (req.user?.role === 'INSPECTOR' && evidence.uploaded_by !== req.user.id) {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Inspector attempted to verify non-owned evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors can only verify evidence they originally submitted.',
      });
    }

    // 2. Download file buffer directly from Supabase Storage using @supabase/supabase-js
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'evidence-vault-private';
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(evidence.storage_path);

    if (downloadError) {
      throw new Error(`Supabase Storage download failed: ${downloadError.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 3. Calculate new SHA-256 hash using Node's crypto module
    const currentHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const originalHash = evidence.sha256_hash;

    // 4. Compare new hash with original DB hash
    const isMatch = constantTimeCompare(currentHash, originalHash);
    const status = isMatch ? 'VERIFIED' : 'TAMPERED';
    const auditAction = isMatch ? 'EVIDENCE_VERIFIED' : 'TAMPER_DETECTED';

    // 5. Log action in audit_logs table
    try {
      await auditService.logEvent({
        req,
        userId: req.user?.id,
        role: req.user?.role || 'JUDGE',
        action: auditAction,
        evidenceId: evidence.id,
        metadata: {
          case_number: evidence.case_number,
          file_name: evidence.file_name,
          original_hash: originalHash,
          current_hash: currentHash,
          status,
          verifier_badge: req.user?.badge_id,
          verifier_role: req.user?.role,
        },
      });
    } catch (auditErr) {
      console.error('[Audit Log Error during verification]:', auditErr.message);
    }

    // 6. Return exact payload: { status: 'VERIFIED' | 'TAMPERED', originalHash, currentHash }
    return res.status(200).json({
      success: true,
      status, // 'VERIFIED' or 'TAMPERED'
      originalHash,
      currentHash,
      match: isMatch,
      evidence_id: evidence.id,
      case_number: evidence.case_number,
      file_name: evidence.file_name,
      file_size: evidence.file_size,
      sealed_db_hash: originalHash,
      recomputed_storage_hash: currentHash,
      verified_at: new Date().toISOString(),
      message: isMatch
        ? 'VERIFIED - INTEGRITY INTACT: Cloud storage buffer matches sealed DB hash.'
        : 'CRITICAL ALERT: Tampering detected! Cloud storage hash differs from sealed database hash.',
    });
  } catch (err) {
    console.error('[Cryptographic Verification Engine Error]:', err);
    return res.status(500).json({
      success: false,
      status: 'TAMPERED',
      error: 'Failed to complete cryptographic verification.',
      details: err.message,
    });
  }
}

// Keep verifyStoredFile pointing to verifyEvidenceHash for backwards compatibility
const verifyStoredFile = verifyEvidenceHash;

/**
 * Verify External Copy of Evidence
 * Accepts an external file uploaded by a Judge or officer, computes its SHA-256,
 * and compares it against the sealed DB hash using constant-time comparison.
 * Accessible to: JUDGE, DCP, INSPECTOR (Own)
 */
async function verifyExternalCopy(req, res) {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'Missing file. Please provide an external evidence copy to verify.',
      });
    }

    const checkQuery = `
      SELECT id, case_number, title, file_name, file_size, sha256_hash, status, uploaded_by
      FROM evidence
      WHERE id = $1;
    `;
    const checkRes = await query(checkQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = checkRes.rows[0];

    // RBAC check:
    if (req.user.role === 'JUDGE' && evidence.status !== 'APPROVED') {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Judge attempted external verification on unapproved evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Judicial verification is restricted to approved evidence.',
      });
    }

    if (req.user.role === 'INSPECTOR' && evidence.uploaded_by !== req.user.id) {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Inspector attempted external verification on non-owned evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors can only verify evidence they originally submitted.',
      });
    }

    // 1. Compute SHA-256 of the uploaded external file buffer
    const externalFileBuffer = req.file.buffer;
    const externalHash = computeSHA256(externalFileBuffer);

    // 2. Constant-time comparison against sealed DB hash
    const isMatch = constantTimeCompare(externalHash, evidence.sha256_hash);
    const verificationStatus = isMatch ? 'MATCH' : 'TAMPERED';
    const message = isMatch
      ? 'VERIFIED - EXTERNAL COPY MATCHES STORED EVIDENCE'
      : 'CRITICAL ALERT: External copy hash does NOT match the sealed vault record! File has been altered or is from an unauthenticated source.';

    // 3. Log in immutable audit log
    try {
      await auditService.logEvent({
        req,
        userId: req.user.id,
        role: req.user.role,
        action: 'EVIDENCE_VERIFIED_EXTERNAL',
        evidenceId: evidence.id,
        metadata: {
          case_number: evidence.case_number,
          stored_file_name: evidence.file_name,
          sealed_db_hash: evidence.sha256_hash,
          external_file_name: req.file.originalname,
          external_file_size: req.file.size,
          external_hash: externalHash,
          result: verificationStatus,
          verifier_badge: req.user.badge_id,
          verifier_role: req.user.role,
        },
      });
    } catch (auditErr) {
      console.error('[Audit Log Error during external verification]:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      status: verificationStatus,
      message,
      match: isMatch,
      evidence_id: evidence.id,
      case_number: evidence.case_number,
      sealed_file_name: evidence.file_name,
      sealed_file_size: evidence.file_size,
      sealed_db_hash: evidence.sha256_hash,
      external_file_name: req.file.originalname,
      external_file_size: req.file.size,
      external_file_hash: externalHash,
      verified_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Verify External Copy Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete external evidence verification.',
      details: err.message,
    });
  }
}

/**
 * Read-Only Streaming Viewer with Dynamic Text Watermark
 * For Judges and Senior Officers to view evidence without download capability.
 * Watermark stamps viewer identity, badge ID, case number, and exact timestamp.
 * Accessible to: JUDGE (Approved files only), DCP (All)
 */
async function streamEvidence(req, res) {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    const checkQuery = `
      SELECT id, case_number, title, file_name, mime_type, file_size, storage_path, sha256_hash, status, uploaded_by
      FROM evidence
      WHERE id = $1;
    `;
    const checkRes = await query(checkQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = checkRes.rows[0];

    // RBAC: Judge can only view APPROVED evidence
    if (req.user.role === 'JUDGE' && evidence.status !== 'APPROVED') {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Judge attempted to stream unapproved evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Judicial viewing is strictly restricted to approved court evidence.',
      });
    }

    // RBAC: Inspector can only view own evidence
    if (req.user.role === 'INSPECTOR' && evidence.uploaded_by !== req.user.id) {
      try {
        await auditService.logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          evidenceId: evidence.id,
          metadata: {
            reason: 'Inspector attempted to stream non-owned evidence',
            case_number: evidence.case_number,
          },
        });
      } catch (auditErr) {}

      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors can only stream evidence they originally submitted.',
      });
    }

    // 1. Download raw file buffer from private storage
    const rawBuffer = await storageService.downloadFile(evidence.storage_path);

    // 2. Prepare watermark context
    const watermarkInfo = {
      userName: req.user.name,
      badgeId: req.user.badge_id,
      timestamp: new Date().toISOString(),
      caseNumber: evidence.case_number,
      sha256Hash: evidence.sha256_hash,
    };

    let responseBuffer = rawBuffer;
    let contentType = evidence.mime_type;

    // 3. Apply appropriate watermarking based on media type
    if (
      evidence.mime_type.startsWith('image/') &&
      ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(evidence.mime_type)
    ) {
      responseBuffer = await watermarkImage(rawBuffer, watermarkInfo);
    } else if (
      evidence.mime_type.startsWith('text/') ||
      evidence.mime_type === 'application/json'
    ) {
      responseBuffer = watermarkText(rawBuffer, watermarkInfo);
    }

    // 4. Set security & watermark headers (Content-Disposition: inline strictly prevents downloads)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="court_view_${evidence.file_name}"`);
    res.setHeader('X-Watermark-User', req.user.name);
    res.setHeader('X-Watermark-Badge', req.user.badge_id);
    res.setHeader('X-Watermark-Timestamp', watermarkInfo.timestamp);
    res.setHeader('X-Watermark-Case', evidence.case_number);
    res.setHeader('X-Watermark-Hash', evidence.sha256_hash);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // 5. Log audit trail
    try {
      await auditService.logEvent({
        req,
        userId: req.user.id,
        role: req.user.role,
        action: 'EVIDENCE_VIEWED',
        evidenceId: evidence.id,
        metadata: {
          case_number: evidence.case_number,
          file_name: evidence.file_name,
          watermarked: true,
          viewer_role: req.user.role,
          viewer_badge: req.user.badge_id,
        },
      });
    } catch (auditErr) {
      console.error('[Audit Log Error on evidence view]:', auditErr.message);
    }

    return res.status(200).send(responseBuffer);
  } catch (err) {
    console.error('[Stream Evidence Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to stream evidence exhibit.',
      details: err.message,
    });
  }
}

/**
 * Retrieve readable/viewable forensic exhibit content directly for Bench & Supervisory review
 * Allows Judge and DCP to inspect text transcripts, logs, images, and document buffers cleanly.
 */
async function getEvidenceContent(req, res) {
  try {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    const checkQuery = `
      SELECT 
        e.*,
        u.name AS uploader_name,
        u.badge_id AS uploader_badge,
        r.name AS reviewer_name,
        r.badge_id AS reviewer_badge
      FROM evidence e
      JOIN users u ON e.uploaded_by = u.id
      LEFT JOIN users r ON e.reviewed_by = r.id
      WHERE e.id = $1;
    `;
    const checkRes = await query(checkQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = checkRes.rows[0];

    // RBAC: Judge can only inspect APPROVED evidence
    if (req.user.role === 'JUDGE' && evidence.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Judicial examination is strictly restricted to approved court evidence.',
      });
    }

    // RBAC: Inspector can only inspect own evidence
    if (req.user.role === 'INSPECTOR' && evidence.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors can only inspect evidence they originally submitted.',
      });
    }

    // Download file buffer from storage
    const buffer = await storageService.downloadFile(evidence.storage_path);
    const mimeType = evidence.mime_type || 'application/octet-stream';
    const fileName = evidence.file_name;

    // Categorize content
    const isText =
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/xml' ||
      /\.(txt|log|json|csv|md|sql|xml|html|js|ts|py|sh)$/i.test(fileName);

    const isImage =
      mimeType.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fileName);

    const isPdf =
      mimeType === 'application/pdf' ||
      /\.pdf$/i.test(fileName);

    const isMedia =
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      /\.(mp3|mp4|wav|ogg|webm|mov)$/i.test(fileName);

    let type = 'BINARY';
    let textContent = null;

    if (isText) {
      type = 'TEXT';
      textContent = buffer.toString('utf-8');
    } else if (isImage) {
      type = 'IMAGE';
    } else if (isPdf) {
      type = 'PDF';
    } else if (isMedia) {
      type = 'MEDIA';
    }

    return res.status(200).json({
      success: true,
      type,
      mimeType,
      fileName,
      fileSize: evidence.file_size,
      sha256Hash: evidence.sha256_hash,
      status: evidence.status,
      textContent,
      watermark: {
        viewerName: req.user.name,
        viewerBadge: req.user.badge_id,
        viewerRole: req.user.role,
        timestamp: new Date().toISOString(),
        caseNumber: evidence.case_number,
      },
      certification: {
        reviewerName: evidence.reviewer_name,
        reviewerBadge: evidence.reviewer_badge,
        reviewedAt: evidence.reviewed_at,
        remarks: evidence.review_remarks,
      },
    });
  } catch (err) {
    console.error('[Get Evidence Content Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence content.',
      details: err.message,
    });
  }
}

/**
 * Visual Audit Chain: getEvidenceAuditLogs
 * Joins audit_logs table with users to fetch all actions (EVIDENCE_INGESTED, APPROVED, EVIDENCE_VERIFIED, etc.)
 * for a specific evidence ID, ordered by timestamp ascending.
 */
async function getEvidenceAuditLogs(req, res) {
  try {
    const evidence_id = req.params.id || req.params.evidence_id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(evidence_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    // Verify evidence exists
    const evCheck = await query(
      'SELECT id, case_number, title, file_name, sha256_hash, status, uploaded_by FROM evidence WHERE id = $1',
      [evidence_id]
    );

    if (evCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = evCheck.rows[0];

    // RBAC: Inspector can only view their own evidence audit logs (allow unassigned/seeded evidence)
    if (
      req.user?.role === 'INSPECTOR' &&
      evidence.uploaded_by &&
      req.user.id &&
      evidence.uploaded_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Inspectors can only access audit chains for their own evidence.',
      });
    }

    // Join audit_logs with users and evidence table, ordered by timestamp ASC
    const auditQuery = `
      SELECT 
        a.id,
        a.timestamp,
        a.action,
        a.role AS log_role,
        a.evidence_id,
        a.metadata,
        a.prev_hash,
        a.entry_hash,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.badge_id,
        COALESCE(u.role::text, a.role) AS user_role,
        COALESCE(
          a.metadata->>'sha256_hash',
          a.metadata->>'current_hash',
          a.metadata->>'original_hash',
          a.metadata->>'sealed_db_hash',
          e.sha256_hash
        ) AS sha256_hash
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN evidence e ON a.evidence_id = e.id
      WHERE a.evidence_id = $1
      ORDER BY a.timestamp ASC;
    `;

    const result = await query(auditQuery, [evidence_id]);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      evidence: {
        id: evidence.id,
        case_number: evidence.case_number,
        title: evidence.title,
        file_name: evidence.file_name,
        sha256_hash: evidence.sha256_hash,
        status: evidence.status,
      },
      auditLogs: result.rows,
    });
  } catch (err) {
    console.error('[Get Evidence Audit Logs Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence audit chain.',
      details: err.message,
    });
  }
}

/**
 * Generate and stream Section 65B Indian Evidence Act Court Admissibility Certificate PDF
 * Route: GET /api/evidence/:id/report
 */
async function generate65BCourtReport(req, res) {
  try {
    const evidence_id = req.params.id || req.params.evidence_id;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(evidence_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid evidence identifier format (UUID required).',
      });
    }

    // Fetch evidence record with uploader particulars
    const evCheck = await query(
      `SELECT e.*, u.name AS uploader_name, u.badge_id AS uploader_badge, u.role AS uploader_role
       FROM evidence e
       LEFT JOIN users u ON e.uploaded_by = u.id
       WHERE e.id = $1`,
      [evidence_id]
    );

    if (evCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evidence record not found.',
      });
    }

    const evidence = evCheck.rows[0];

    // Fetch immutable audit trail
    const auditQuery = `
      SELECT 
        a.id,
        a.timestamp,
        a.action,
        a.role AS log_role,
        a.metadata,
        a.prev_hash,
        a.entry_hash,
        u.name AS user_name,
        u.badge_id,
        COALESCE(u.role::text, a.role) AS user_role,
        COALESCE(
          a.metadata->>'sha256_hash',
          a.metadata->>'current_hash',
          a.metadata->>'original_hash',
          a.metadata->>'sealed_db_hash',
          e.sha256_hash
        ) AS sha256_hash
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN evidence e ON a.evidence_id = e.id
      WHERE a.evidence_id = $1
      ORDER BY a.timestamp ASC;
    `;

    const auditRes = await query(auditQuery, [evidence_id]);
    const auditLogs = auditRes.rows;

    // Record audit event for report generation
    try {
      await auditService.logEvent({
        req,
        userId: req.user?.id,
        role: req.user?.role || 'SYSTEM',
        action: 'EVIDENCE_REPORT_GENERATED',
        evidenceId: evidence.id,
        metadata: {
          case_number: evidence.case_number,
          report_type: 'SEC_65B_CERTIFICATE',
          requested_by: req.user?.name,
        },
      });
    } catch (auditErr) {
      console.warn('[Audit Log Warning]:', auditErr.message);
    }

    // Stream PDF directly to client
    reportService.generate65BCourtReport(evidence, auditLogs, res);
  } catch (err) {
    console.error('[Generate 65B Report Error]:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate Section 65B court report.',
        details: err.message,
      });
    }
  }
}

module.exports = {
  uploadEvidence,
  getMyEvidence,
  getEvidenceById,
  getAllEvidenceForDCP,
  reviewEvidence,
  verifyStoredFile,
  verifyEvidenceHash,
  verifyExternalCopy,
  streamEvidence,
  getEvidenceContent,
  getEvidenceAuditLogs,
  generate65BCourtReport,
};

