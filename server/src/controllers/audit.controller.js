const auditService = require('../services/audit.service');

/**
 * Recalculate and verify the entire cryptographic audit log chain
 * Accessible to: DCP, JUDGE
 */
async function verifyChain(req, res) {
  try {
    const verification = await auditService.verifyDatabaseAuditChain();

    if (verification.verified) {
      return res.status(200).json({
        success: true,
        status: 'VERIFIED',
        message: 'Cryptographic audit chain is intact. No tampering detected.',
        details: verification,
      });
    } else {
      return res.status(200).json({
        success: false,
        status: 'TAMPERED',
        message: 'CRITICAL WARNING: Cryptographic audit chain verification failed! Tampering or deletion detected.',
        details: verification,
      });
    }
  } catch (err) {
    console.error('[Audit Controller: verifyChain Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete audit chain verification.',
      details: err.message,
    });
  }
}

/**
 * Retrieve paginated audit trail records
 * Accessible to: DCP, JUDGE
 */
async function getAuditTrail(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const action = req.query.action || null;
    const userId = req.query.userId || null;
    const evidenceId = req.query.evidenceId || null;

    const data = await auditService.getAuditLogs({
      page,
      limit,
      action,
      userId,
      evidenceId,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('[Audit Controller: getAuditTrail Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit trail.',
      details: err.message,
    });
  }
}

/**
 * Retrieve global system audit logs
 * GET /api/audit-logs/global or /api/audit/global
 * Accessible to: INSPECTOR, DCP, JUDGE
 */
async function getGlobalAuditLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const logs = await auditService.getGlobalAuditLogs(limit);

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.error('[Audit Controller: getGlobalAuditLogs Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve global audit trail.',
      details: err.message,
    });
  }
}

/**
 * Retrieve personal activity logs strictly scoped to the authenticated user
 * Accessible to: INSPECTOR, DCP, JUDGE
 */
async function getMyActivity(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const action = req.query.action || null;

    const data = await auditService.getAuditLogs({
      page,
      limit,
      action,
      userId: req.user.id, // Enforce strict ownership check
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('[Audit Controller: getMyActivity Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve your activity log.',
      details: err.message,
    });
  }
}

module.exports = {
  verifyChain,
  getAuditTrail,
  getGlobalAuditLogs,
  getMyActivity,
};

