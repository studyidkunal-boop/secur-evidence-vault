const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db');
const auditService = require('../services/audit.service');

/**
 * Authentication Middleware
 * Extracts and verifies JWT from httpOnly cookie or Bearer Authorization header.
 * Verifies active user status against the database.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check httpOnly cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fall back to Authorization: Bearer <token>
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 3. Fall back to query param ?token=... (for <img>, <iframe>, streaming media)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session token provided.',
      });
    }

    // 3. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token.',
      });
    }

    // 4. Verify user exists and is active in the database
    const userRes = await query(
      'SELECT id, name, email, role, badge_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or has been revoked.',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive. Contact the system administrator.',
      });
    }

    // Attach authenticated user to request context
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal security authentication failure.',
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * @param {string[]} allowedRoles - Array of permitted roles (e.g. ['INSPECTOR', 'DCP'])
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthenticated user.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Audit log unauthorized RBAC violation attempt
      auditService
        .logEvent({
          req,
          userId: req.user.id,
          role: req.user.role,
          action: 'ACCESS_DENIED',
          metadata: {
            attemptedRole: req.user.role,
            requiredRoles: allowedRoles,
            targetUrl: req.originalUrl,
            method: req.method,
          },
        })
        .catch((err) => {
          console.error('[Audit Log Error on access denied]:', err.message);
        });

      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};

