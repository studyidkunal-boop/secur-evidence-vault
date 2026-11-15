import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import SecuraLogo from '../components/SecuraLogo';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const ROLE_DESCRIPTIONS = {
  INSPECTOR: {
    title: 'Police Inspector (IO)',
    desc: 'Investigating Officer jurisdiction • Field Evidence Ingestion, SHA-256 Custody Anchoring & Version Resubmission.',
    accent: 'text-blue-700',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  DCP: {
    title: 'Deputy Commissioner of Police',
    desc: 'Supervisory Review Authority • Section 63 BSA Custody Approval, Review Queue Management & Global Audit Ledger.',
    accent: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  JUDGE: {
    title: 'District & Sessions Judge',
    desc: 'Judicial Chamber Jurisdiction • Court Docket Bench Examination, Real-Time Hash Parity & External Copy Verification.',
    accent: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'INSPECTOR',
    inviteCode: '',
    department: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMessage('');
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
  }

  // Real-time password criteria validation
  const hasMinLength = formData.password.length >= 10;
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasLower = /[a-z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    // Client-side quick checks
    if (!isPasswordStrong) {
      setErrorMessage('Please ensure your password satisfies all security requirements below.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    if (!formData.inviteCode.trim()) {
      setErrorMessage('Institutional authorization invite code is required.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/auth/signup', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        inviteCode: formData.inviteCode.trim(),
        department: formData.department.trim() || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        // Redirection with success state to login page (Choice: explicit login required for audit trail)
        navigate('/login', {
          state: {
            signupSuccess: `Institutional account for ${response.data.user.name} [Badge ID: ${response.data.user.badge_id}] registered successfully. Please sign in to authenticate.`,
          },
          replace: true,
        });
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setErrorMessage(
          err.response?.data?.error ||
            'Invalid institutional invite code. Contact your Department IT Cell or Court Registrar.'
        );
      } else if (err.response?.status === 400 && err.response?.data?.details) {
        setErrorMessage(err.response.data.details[0] || 'Validation error');
      } else {
        setErrorMessage(
          err.response?.data?.error ||
            err.message ||
            'Unable to process registration at this time.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRoleInfo = ROLE_DESCRIPTIONS[formData.role] || ROLE_DESCRIPTIONS.INSPECTOR;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2f7] via-[#e2e8f0] to-[#cbd5e1] relative overflow-hidden flex flex-col justify-center items-center py-10 px-4 sm:px-6 font-sans">
      {/* Ambient Darker Crystal Facets */}
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-[3rem] rotate-45 bg-gradient-to-br from-slate-700/35 via-slate-800/30 to-slate-900/35 backdrop-blur-xl border border-slate-400/40 shadow-[0_16px_40px_rgba(15,23,42,0.22)] pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-24 -left-16 w-96 h-96 rounded-[4rem] -rotate-12 bg-gradient-to-tr from-slate-700/35 via-slate-800/30 to-slate-900/25 backdrop-blur-xl border border-slate-400/30 shadow-[0_16px_40px_rgba(15,23,42,0.2)] pointer-events-none animate-float-reverse" />

      {/* Web Ratio Official Portal Card Container */}
      <div className="w-full max-w-[580px] relative z-10 backdrop-blur-xl bg-white/95 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset] border border-white/80 p-7 sm:p-9 flex flex-col my-auto transition-all overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 relative z-10">
          <div className="flex items-center space-x-2">
            <img
              src="/emblem.png"
              alt="Government of India"
              className="h-11 sm:h-12 w-auto object-contain select-none"
            />
          </div>
          <div className="flex items-center">
            <SecuraLogo className="text-[22px] sm:text-[24px]" />
          </div>
        </div>

        <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-4 relative z-10">
          Official Government of India portal for {LEGAL_LABEL} digital evidence custody registration.
        </p>

        {/* Title */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Officer Registration
          </h1>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
            {LEGAL_SHORT_LABEL}
          </span>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2 text-xs relative z-10 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="font-semibold leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Full Name & Institutional Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Inspector / Judge Name"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="name@police.gov.in"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Role Dropdown with Contextual Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Authorized Institutional Role <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Shield className="h-4 w-4" />
              </div>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
              >
                <option value="INSPECTOR">INSPECTOR — Police Investigating Officer</option>
                <option value="DCP">DCP — Deputy Commissioner of Police (Reviewer)</option>
                <option value="JUDGE">JUDGE — Judicial Magistrate / Sessions Judge</option>
              </select>
            </div>

            {/* Role Card Banner */}
            <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${selectedRoleInfo.badge}`}>
              <div className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{selectedRoleInfo.title}</span>
              </div>
              <p className="mt-0.5 opacity-90">{selectedRoleInfo.desc}</p>
            </div>
          </div>

          {/* Department (Optional) & Role Invite Code Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Court Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Cyber Crime Cell, West District"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role Invite Code <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  required
                  placeholder="Secret role invite key"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Password & Confirm Password Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Min 10 characters"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-type password"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Security Criteria Hints */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
            <span className="font-semibold text-slate-600 block">Password Requirements:</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <span className={hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {hasMinLength ? '✓' : '•'} Min 10 characters
              </span>
              <span className={hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {hasUpper ? '✓' : '•'} Uppercase letter (A-Z)
              </span>
              <span className={hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {hasLower ? '✓' : '•'} Lowercase letter (a-z)
              </span>
              <span className={hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {hasNumber ? '✓' : '•'} Number (0-9)
              </span>
              <span className={hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {hasSpecial ? '✓' : '•'} Special symbol (!@#$%...)
              </span>
              <span className={passwordsMatch && formData.confirmPassword ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                {passwordsMatch && formData.confirmPassword ? '✓' : '•'} Passwords match
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Register Official Credentials</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="mt-4 text-center text-xs text-slate-600 relative z-10">
          <span>Already have an authorized account? </span>
          <Link
            to="/login"
            className="font-bold text-blue-700 hover:text-blue-800 hover:underline transition"
          >
            Sign in here
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center relative z-10">
          <p className="text-[10px] text-slate-400">
            Powered by the Government of India – Ministry of Home Affairs & Digital Evidence Portal
          </p>
        </div>
      </div>
    </div>
  );
}
