import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { AuthService, INITIAL_USERS } from '../services/authService';
import { 
  ShieldCheck, 
  Car, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  DollarSign,
  UserCheck,
  Building2,
  Lock,
  Mail,
  Phone,
  LogIn
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenDeveloperManual?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess, 
  onOpenDeveloperManual 
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState<string>('admin@vahaanflow.in');
  const [signInPassword, setSignInPassword] = useState<string>('admin123');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sign Up state: 2 Roles only: Admin & Vehicle Owner
  const [accountType, setAccountType] = useState<'admin' | 'vehicle_owner'>('vehicle_owner');
  const [fullName, setFullName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('+91 ');
  const [upiId, setUpiId] = useState<string>('');

  // Forgot Password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Quick 1-click login
  const handleQuickLogin = async (user: UserProfile) => {
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.login(user.email, user.password || 'admin123');
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Login failed. Please check your password.');
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter both your email and password.');
      return;
    }
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.login(signInEmail, signInPassword);
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Login failed. Please check your email or password.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setSignInError('Please fill in your name, email, and password.');
      return;
    }
    setIsSubmitting(true);
    setSignInError(null);
    const res = await AuthService.register({
      name: fullName,
      email: signUpEmail,
      password: signUpPassword,
      phone,
      role: accountType,
      upiId,
    });
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Could not create account.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetStatus({ message: 'Please enter your registered email address.', type: 'error' });
      return;
    }
    setIsResetting(true);
    setResetStatus(null);
    const res = await AuthService.requestPasswordReset(resetEmail);
    setIsResetting(false);
    setResetStatus({ message: res.message, type: 'success' });
  };

  const switchToLoginWithExistingEmail = () => {
    setSignInEmail(signUpEmail);
    setSignInError(null);
    setMode('signin');
  };

  const switchToSignUpWithEnteredEmail = () => {
    setSignUpEmail(signInEmail);
    setSignInError(null);
    setMode('signup');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-lg">
              व
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-none">
                VahaanFlow
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Easy Car Rental & Fleet System for India
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDeveloperManual && (
              <button
                type="button"
                onClick={onOpenDeveloperManual}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="View & Download Developer Guide"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Developer Guide (.md)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        
        {/* Left Column: Simple overview for Indian users */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
              <span>SIMPLE 2-ROLE SYSTEM</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Car rental & fleet management, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">made very easy</span>.
            </h1>

            <p className="text-sm text-neutral-400 leading-relaxed">
              Login as <strong className="text-white">Admin</strong> to run the business, or as a <strong className="text-white">Car Owner</strong> to give your car for rent and earn money. Both can also rent cars as regular customers anytime.
            </p>
          </div>

          {/* Role Cards in plain words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>1. Admin (Runs the Platform)</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Add/remove cars, approve car owners, give keys, take returns, check damages, and send bank payouts to owners.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Car className="h-4 w-4 text-emerald-400" />
                <span>2. Car Owner (Gives Car for Rent)</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Add your own cars (can skip documents for now), block dates for personal use, see your bookings, and view your earnings.
              </p>
            </div>
          </div>

          {/* Quick 1-Click Switch Demo Accounts */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200">
                ⚡ Quick Demo Accounts (1-Click Login)
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Click any profile to test
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[0])}
                className="text-left p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                  <span>Vikram Shinde</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Platform Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[1])}
                className="text-left p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                  <span>Suresh Patel</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Car Owner (Petrol/Diesel)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(INITIAL_USERS[2])}
                className="text-left p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-emerald-500/50 hover:bg-neutral-900 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                  <span>Anita Roy</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Car Owner (Electric EV)</div>
              </button>
            </div>
            <p className="text-[10px] text-neutral-500">
              * Note: Once logged in, you can click "Rent a Car" in the top bar to test renting cars as a regular customer.
            </p>
          </div>
        </div>

        {/* Right Column: Sign In & Sign Up Form */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
              <button
                type="button"
                onClick={() => { setMode('signin'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'signin'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  mode === 'signup'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner with 1-Click Action */}
            {signInError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <span className="leading-snug font-medium">{signInError}</span>
                </div>

                {/* Case 1: If email already exists during sign up, jump to login */}
                {signInError.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={switchToLoginWithExistingEmail}
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Click here to Login with this email</span>
                  </button>
                )}

                {/* Case 2: If email does not exist during login, jump to create account */}
                {(signInError.toLowerCase().includes('not exist') || signInError.toLowerCase().includes('create an account')) && (
                  <button
                    type="button"
                    onClick={switchToSignUpWithEnteredEmail}
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Click here to Create an Account with this email</span>
                  </button>
                )}
              </div>
            )}

            {/* Mode: Sign In */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Email ID</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      placeholder="e.g. admin@vahaanflow.in or suresh.patel@fleet.in"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-neutral-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(signInEmail);
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <span>Logging in...</span> : <span>Login to Account</span>}
                </button>
              </form>
            )}

            {/* Mode: Sign Up (2 Roles Only) */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Choose Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType('vehicle_owner')}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        accountType === 'vehicle_owner'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="font-bold text-xs">Car Owner</div>
                      <div className="text-[10px] text-neutral-400">Give car for rent & earn</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('admin')}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        accountType === 'admin'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="font-bold text-xs">Admin</div>
                      <div className="text-[10px] text-neutral-400">Run the rental system</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Email ID</label>
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      placeholder="owner@domain.com"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Create Password</label>
                  <input
                    type="password"
                    required
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {accountType === 'vehicle_owner' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      UPI ID for Payouts (Google Pay / PhonePe / Paytm)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okaxis"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? <span>Creating Account...</span> : <span>Create Account</span>}
                </button>
              </form>
            )}

          </div>
        </div>

      </main>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-400" />
                <span>Forgot Your Password?</span>
              </h3>
              <button onClick={() => setForgotPasswordOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-neutral-400">
              Enter your registered email address. We will reset your password so you can login again.
            </p>

            {resetStatus && (
              <div className={`p-3 rounded-lg text-xs border ${
                resetStatus.type === 'success' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}>
                {resetStatus.message}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Your Registered Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="e.g. admin@vahaanflow.in"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs disabled:opacity-50"
                >
                  {isResetting ? 'Sending...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-4 text-center text-xs text-neutral-500 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VahaanFlow &middot; Simple Vehicle Rental & Fleet System for India</span>
          <span className="font-mono text-[11px]">Strict Data Privacy & Safe Payouts</span>
        </div>
      </footer>

    </div>
  );
};
