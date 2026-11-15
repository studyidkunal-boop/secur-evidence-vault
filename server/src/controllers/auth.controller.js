const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { query } = require('../db');
const env = require('../config/env');
const auditService = require('../services/audit.service');

// Password complexity regex: min 10 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;

const signupSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .min(2, 'Full name must be at least 2 characters')
      .max(80, 'Full name cannot exceed 80 characters')
      .trim(),
    email: z
      .string({ required_error: 'Institutional email is required' })
      .email('Valid institutional email address is required')
      .max(255, 'Email cannot exceed 255 characters')
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string({ required_error: 'Password is required' })
      .min(10, 'Password must be at least 10 characters long')
      .regex(
        PASSWORD_REGEX,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol'
      ),
    confirmPassword: z.string({ required_error: 'Password confirmation is required' }),
    role: z.enum(['INSPECTOR', 'DCP', 'JUDGE'], {
      errorMap: () => ({ message: "Role must be 'INSPECTOR', 'DCP', or 'JUDGE'" }),
    }),
    inviteCode: z
      .string({ required_error: 'Institutional authorization invite code is required' })
      .min(1, 'Invite code cannot be empty')
      .trim(),
    department: z.string().max(255).optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Valid institutional email is required')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Constant-time comparison for role authorization invite codes.
 * Hashes both strings with SHA-256 before timingSafeEqual to avoid length leak attacks.
 */
function verifyRoleInviteCode(role, suppliedCode) {
  if (!suppliedCode || typeof suppliedCode !== 'string') return false;

  let expectedCode = '';
  if (role === 'INSPECTOR') expectedCode = env.INSPECTOR_INVITE_CODE;
  else if (role === 'DCP') expectedCode = env.DCP_INVITE_CODE;
  else if (role === 'JUDGE') expectedCode = env.JUDGE_INVITE_CODE;
  else return false;

  if (!expectedCode) return false;

  const hashSupplied = crypto.createHash('sha256').update(suppliedCode.trim()).digest();
  const hashExpected = crypto.createHash('sha256').update(expectedCode.trim()).digest();

  return crypto.timingSafeEqual(hashSupplied, hashExpected);
}

/**
 * Automatically generates a unique, sequential/random 4-digit badge ID per role.
 * e.g. INSP-8492, DCP-5541, JUDGE-1102
 */
async function generateUniqueBadgeId(role) {
  const prefixMap = {
    INSPECTOR: 'INSP',
    DCP: 'DCP',
    JUDGE: 'JUDGE',
  };
  const prefix = prefixMap[role] || 'OFF';

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 1000 - 9999
    const candidate = `${prefix}-${randomDigits}`;

    const checkRes = await query('SELECT id FROM users WHERE badge_id = $1', [candidate]);
    if (checkRes.rows.length === 0) {
      return candidate;
    }
  }

  throw new Error('Collision resolving unique officer badge ID. Please retry registration.');
}

/**
 * Register a new institutional user with strict role invite code verification.
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { name, email, password, role, inviteCode } = parseResult.data;

    // 1. Verify Role Invite Code (CRITICAL SECURITY GATE)
    const isCodeValid = verifyRoleInviteCode(role, inviteCode);
    if (!isCodeValid) {
      try {
        await auditService.logEvent({
          req,
          userId: null,
          role: role,
          action: 'SIGNUP_DENIED',
          metadata: {
            attemptedRole: role,
            attemptedEmail: email,
            reason: 'Invalid institutional invite code',
          },
        });
      } catch (logErr) {
        console.error('[Audit Log Error on signup denied]:', logErr.message);
      }

      return res.status(403).json({
        success: false,
        error: 'Invalid institutional authorization invite code for the requested role.',
      });
    }

    // 2. Prevent User Enumeration on duplicate email
    const existingUser = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Unable to create account with these details.',
      });
    }

    // 3. Generate unique role-based badge ID on the server (never accept badge_id from client)
    const badgeId = await generateUniqueBadgeId(role);

    // 4. Hash password with bcrypt (cost factor: 12)
    const BCRYPT_SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 5. Persist user to PostgreSQL
    const insertRes = await query(
      `INSERT INTO users (name, email, password_hash, role, badge_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, email, role, badge_id, created_at;`,
      [name, email, passwordHash, role, badgeId]
    );

    const newUser = insertRes.rows[0];

    // 6. Anchor SIGNUP_SUCCESS event to the immutable cryptographic audit log
    try {
      await auditService.logEvent({
        req,
        userId: newUser.id,
        role: newUser.role,
        action: 'SIGNUP_SUCCESS',
        metadata: {
          registeredRole: newUser.role,
          badgeId: newUser.badge_id,
          registeredEmail: newUser.email,
        },
      });
    } catch (logErr) {
      console.error('[Audit Log Error on signup success]:', logErr.message);
    }

    // 7. Return success response (do NOT auto-login; explicit sign-in required for audit custody verification)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your institutional credentials.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        badge_id: newUser.badge_id,
      },
    });
  } catch (err) {
    console.error('[Signup Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while processing registration.',
      details: err.message,
    });
  }
}

/**
 * Handle user login, password verification, and JWT session generation
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
    }

    const { email, password } = parseResult.data;

    // Fetch user by email
    const userRes = await query(
      'SELECT id, name, email, password_hash, role, badge_id, is_active FROM users WHERE LOWER(email) = $1',
      [email]
    );

    if (userRes.rows.length === 0) {
      try {
        await auditService.logEvent({
          req,
          userId: null,
          role: null,
          action: 'LOGIN_FAILED',
          metadata: { attemptedEmail: email, reason: 'Account does not exist' },
        });
      } catch (logErr) {
        console.error('[Audit Log Error on failed login]:', logErr.message);
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or account does not exist.',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      try {
        await auditService.logEvent({
          req,
          userId: user.id,
          role: user.role,
          action: 'LOGIN_FAILED',
          metadata: { attemptedEmail: email, reason: 'Account deactivated' },
        });
      } catch (logErr) {
        console.error('[Audit Log Error on deactivated login]:', logErr.message);
      }

      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Contact an administrator.',
      });
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      try {
        await auditService.logEvent({
          req,
          userId: user.id,
          role: user.role,
          action: 'LOGIN_FAILED',
          metadata: { attemptedEmail: email, reason: 'Password mismatch' },
        });
      } catch (logErr) {
        console.error('[Audit Log Error on password mismatch]:', logErr.message);
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or account does not exist.',
      });
    }

    // Generate JWT token (Payload role strictly from database row)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        badge_id: user.badge_id,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Set HTTP-Only Cookie
    const isProduction = env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    // Audit log successful login
    try {
      await auditService.logEvent({
        req,
        userId: user.id,
        role: user.role,
        action: 'LOGIN_SUCCESS',
        metadata: {
          email: user.email,
          badge_id: user.badge_id,
          role: user.role,
        },
      });
    } catch (logErr) {
      console.error('[Audit Log Error on login success]:', logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        badge_id: user.badge_id,
      },
    });
  } catch (err) {
    console.error('[Login Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication server error.',
    });
  }
}

/**
 * Handle user logout and clear session cookie
 */
async function logout(req, res) {
  try {
    if (req.user) {
      await auditService.logEvent({
        req,
        userId: req.user.id,
        role: req.user.role,
        action: 'LOGOUT',
        metadata: {
          email: req.user.email,
          badge_id: req.user.badge_id,
        },
      });
    }
  } catch (logErr) {
    console.error('[Audit Log Error on logout]:', logErr.message);
  }

  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * Get profile of currently authenticated user
 */
async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
}

module.exports = {
  signup,
  register: signup, // Backward compatibility alias
  login,
  logout,
  getCurrentUser,
};
