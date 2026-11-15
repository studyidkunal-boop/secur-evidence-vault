import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SecuraLogo from '../components/SecuraLogo';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import {
  Lock,
  Mail,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  KeyRound,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login, getRoleHomePath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;
  const signupSuccessMessage = location.state?.signupSuccess || null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      const targetPath = from || getRoleHomePath(loggedInUser.role);
      navigate(targetPath, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2f7] via-[#e2e8f0] to-[#cbd5e1] relative overflow-hidden flex flex-col justify-center items-center py-10 px-4 sm:px-6 font-sans">
      {/* Ambient Darker Crystal Facets & Prism Reflections (Smoky Glass Facet Background) */}
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-[3rem] rotate-45 bg-gradient-to-br from-slate-700/35 via-slate-800/30 to-slate-900/35 backdrop-blur-xl border border-slate-400/40 shadow-[0_16px_40px_rgba(15,23,42,0.22)] pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-24 -left-16 w-96 h-96 rounded-[4rem] -rotate-12 bg-gradient-to-tr from-slate-700/35 via-slate-800/30 to-slate-900/25 backdrop-blur-xl border border-slate-400/30 shadow-[0_16px_40px_rgba(15,23,42,0.2)] pointer-events-none animate-float-reverse" />
      <div className="absolute -top-36 left-1/4 w-[520px] h-[750px] bg-gradient-to-b from-slate-600/15 via-slate-700/10 to-transparent rotate-[28deg] blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 left-8 w-56 h-56 rounded-full bg-gradient-to-tr from-slate-600/25 to-slate-700/20 blur-xl pointer-events-none animate-float-particle" />
      <div
        className="absolute bottom-1/4 right-12 w-64 h-64 rounded-full bg-gradient-to-bl from-slate-700/25 via-slate-800/20 to-transparent blur-xl pointer-events-none animate-float-slow"
        style={{ animationDelay: '-7s' }}
      />

      {/* Web Ratio Official Portal Card Container (Desktop Web Proportion) */}
      <div className="w-full max-w-[540px] relative z-10 backdrop-blur-xl bg-white/95 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset] border border-white/80 p-7 sm:p-9 flex flex-col my-auto transition-all overflow-hidden">
        {/* Top Specular Sheen Overlay */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 via-white/10 to-transparent pointer-events-none" />
        {/* Top Rim Crystal Specular Highlight Line */}
        <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 pointer-events-none" />

        {/* Institutional Header: Government of India Emblem + Secura Brand (No RGB light line) */}
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

        {/* Official Subtitle */}
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-5 relative z-10">
          An official Government of India portal for {LEGAL_LABEL} digital evidence custody, cryptographic integrity and judicial audit.
        </p>

        {/* Heading: Sign up/ Log in */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign up/ Log in
          </h1>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
            {LEGAL_SHORT_LABEL}
          </span>
        </div>

        {/* Success Alert from Signup Redirect */}
        {signupSuccessMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center space-x-2 relative z-10 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{signupSuccessMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 flex items-start space-x-2 text-xs relative z-10">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Authentication Form with Email and Password */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <div className="relative rounded-xl group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedRoleTag(null);
                }}
                placeholder="officer@police.gov.in"
                className="block w-full pl-10 pr-3.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-xs"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              We'll authenticate your digital signature and cryptographic credentials
            </p>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative rounded-xl group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedRoleTag(null);
                }}
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all duration-200 shadow-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Primary Action Button: Continue */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#001f9c] hover:bg-[#001980] active:scale-[0.99] shadow-md shadow-blue-900/20 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150"
            >
              {submitting ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Signing In...</span>
                </span>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </div>
        </form>

        {/* Divider: or */}
        <div className="relative my-4 relative z-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-medium">or</span>
          </div>
        </div>

        {/* Continue with Google (Apple is removed as requested) */}
        <button
          type="button"
          onClick={() => handleQuickRoleSelect('INSPECTOR', 'inspector@police.gov.in', 'Inspector@123')}
          className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] transition shadow-xs relative z-10"
        >
          <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Bottom Signup Link */}
        <div className="mt-4 text-center text-xs text-slate-600 relative z-10">
          <span>Don't have an official account? </span>
          <Link
            to="/signup"
            className="font-bold text-blue-700 hover:text-blue-800 hover:underline transition"
          >
            Create account
          </Link>
        </div>

        {/* Official Government Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center relative z-10">
          <p className="text-[11px] text-slate-400">
            Powered by the Government of India – Ministry of Home Affairs & Digital Evidence Portal
          </p>
        </div>
      </div>

      {/* Institutional Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-slate-900 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Password Recovery
                </h3>
                <p className="text-[11px] text-slate-500">
                  Forensic Chain of Custody Protocol
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4">
              <p className="mb-2">
                Under Section 65B forensic protocols, public password reset links are disabled to protect chain of custody.
              </p>
              <p className="font-semibold text-slate-800">
                Contact your Department Administrator or District IT Cell with your Badge ID for key re-issuance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
