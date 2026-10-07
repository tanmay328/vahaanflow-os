import React, { useState } from 'react';
import { UserProfile } from '../types/auth';
import { AuthService } from '../services/authService';
import { 
  ShieldCheck, 
  Car, 
  KeyRound, 
  ArrowRight, 
  AlertCircle,
  Lock,
  Mail,
  LogIn,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  initialError?: string;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess, 
  theme = 'dark',
  onToggleTheme,
  initialError,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');
  const [signInError, setSignInError] = useState<string | null>(initialError || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState<boolean>(false);

  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState<boolean>(false);

  // Sign Up state: 2 Dedicated Sections: "Owner of a car" & "Customer to rent a car"
  const [accountType, setAccountType] = useState<'vehicle_owner' | 'renter'>('vehicle_owner');
  const [fullName, setFullName] = useState<string>('');
  const [signUpEmail, setSignUpEmail] = useState<string>('');
  const [signUpPassword, setSignUpPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('+91 ');
  const [upiId, setUpiId] = useState<string>('');
  const [drivingLicense, setDrivingLicense] = useState<string>('');

  // Forgot / Reset Password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleGoogleSignInOrSignUp = async (targetRole?: 'vehicle_owner' | 'renter') => {
    setIsGoogleSubmitting(true);
    setSignInError(null);

    const roleToAssign = targetRole || (mode === 'signup' ? accountType : 'renter');
    const res = await AuthService.loginWithGoogle(roleToAssign, {
      phone: phone.trim() !== '+91' && phone.trim() !== '+91 ' ? phone.trim() : undefined,
      upiId: accountType === 'vehicle_owner' ? upiId.trim() : undefined,
      drivingLicense: accountType === 'renter' ? drivingLicense.trim() : undefined,
    });

    setIsGoogleSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Google sign-in could not be completed.');
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
      upiId: accountType === 'vehicle_owner' ? upiId : undefined,
      drivingLicense: accountType === 'renter' ? drivingLicense : undefined,
    });
    setIsSubmitting(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setSignInError(res.error || 'Could not create account.');
    }
  };

  // Dispatch Reset Link via Firebase Auth
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

    if (res.success) {
      setResetStatus({ 
        message: res.message, 
        type: 'success' 
      });
    } else {
      setResetStatus({ message: res.message, type: 'error' });
    }
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
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'
    }`}>
      
      {/* Top Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors duration-300 ${
        theme === 'dark' ? 'border-neutral-800 bg-neutral-950/80 text-neutral-100' : 'border-slate-200 bg-white/80 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-extrabold text-lg">
              G
            </div>
            <div>
              <span className={`text-base font-extrabold tracking-tight block leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                GoDrive
              </span>
              <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                Smart Car Rental & Fleet Platform
              </span>
            </div>
          </div>

          {/* Theme Switch Button (Top Right Corner) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-sm ${
                theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 stroke-[2]" />
              ) : (
                <Moon className="h-4 w-4 stroke-[2]" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        
        {/* Left Column: Overview */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight transition-colors duration-300 ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>
              Car Rental <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Made Easy</span>
            </h1>

            <p className={`text-sm leading-relaxed transition-colors duration-300 ${
              theme === 'light' ? 'text-slate-600' : 'text-neutral-400'
            }`}>
              Rent verified vehicles or list your car to start earning.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className={`rounded-xl border p-3.5 space-y-1.5 transition-all duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Car className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Car Owner</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                List vehicles, block dates & track earnings.
              </p>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-1.5 transition-all duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-white shadow-sm text-slate-800' : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <KeyRound className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Customer</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Rent cars with quick KYC verification.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In & Sign Up Form */}
        <div className="lg:col-span-6 flex justify-center">
          <div className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900/90 text-neutral-100'
          }`}>
            
            {/* Mode Switcher */}
            <div className={`flex rounded-xl p-1 border transition-colors duration-300 ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <button
                type="button"
                onClick={() => { setMode('signin'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signin'
                    ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm')
                    : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white')
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setSignInError(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm')
                    : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white')
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner with 1-Click Action */}
            {signInError && (
              <div className={`rounded-xl border p-3.5 text-xs space-y-2 transition-all duration-300 ${
                theme === 'light' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span className="leading-snug font-medium">{signInError}</span>
                </div>

                {/* Case 1: If email already exists during sign up, jump to login */}
                {signInError.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={switchToLoginWithExistingEmail}
                    className={`w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer ${
                      theme === 'light' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                    }`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Click here to Login with this email</span>
                  </button>
                )}

                {/* Case 2: If email does not exist during login, jump to create account */}
                {(signInError.toLowerCase().includes('not exist') || signInError.toLowerCase().includes('create an account') || signInError.toLowerCase().includes('user not found')) && (
                  <button
                    type="button"
                    onClick={switchToSignUpWithEnteredEmail}
                    className={`w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer ${
                      theme === 'light' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                    }`}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Click here to Create an Account with this email</span>
                  </button>
                )}
              </div>
            )}

            {/* Mode: Sign In */}
            {mode === 'signin' && (
              <div className="space-y-4">
                {/* Google Sign In Option */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignInOrSignUp()}
                  disabled={isSubmitting || isGoogleSubmitting}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-400 shadow-slate-100'
                      : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white hover:border-neutral-700'
                  }`}
                >
                  <GoogleIcon />
                  <span>{isGoogleSubmitting ? 'Signing in with Google...' : 'Continue with Google'}</span>
                </button>

                {/* Divider */}
                <div className="relative flex py-0.5 items-center">
                  <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}></div>
                  <span className={`flex-shrink mx-3 text-[10px] uppercase tracking-wider font-semibold ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`}>
                    or sign in with email
                  </span>
                  <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}></div>
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Email ID</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(signInEmail);
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type={showSignInPassword ? "text" : "password"}
                      required
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`w-full rounded-lg border pl-9 pr-10 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className={`absolute right-3 top-2.5 p-0.5 rounded transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'text-slate-400 hover:text-slate-700'
                          : 'text-neutral-500 hover:text-neutral-200'
                      }`}
                      title={showSignInPassword ? "Hide password" : "Show password"}
                      aria-label={showSignInPassword ? "Hide password" : "Show password"}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/10 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <span>Logging in...</span> : <span>Login to Account</span>}
                </button>
              </form>
            </div>
            )}

            {/* Mode: Sign Up with 2 Dedicated Sections: "Owner of a car" vs "Customer to rent a car" */}
            {mode === 'signup' && (
              <div className="space-y-4">
                {/* Section Toggle */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-800' : 'text-neutral-300'
                  }`}>
                    Select Account Type:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Section 1: Owner of a car */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('vehicle_owner');
                        setSignInError(null);
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                        accountType === 'vehicle_owner'
                          ? (theme === 'light' ? 'border-emerald-600 bg-emerald-50 text-slate-900 ring-1 ring-emerald-600/35 shadow-sm' : 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500/40 shadow-sm')
                          : (theme === 'light' ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Car className={`h-4 w-4 shrink-0 ${accountType === 'vehicle_owner' ? 'text-emerald-500' : 'text-neutral-400'}`} />
                        <span>Owner of a car</span>
                      </div>
                      <div className={`text-[10px] mt-1 leading-snug ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                        Give car for rent & earn money
                      </div>
                      {accountType === 'vehicle_owner' && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </button>

                    {/* Section 2: Customer to rent a car */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('renter');
                        setSignInError(null);
                      }}
                      className={`relative p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                        accountType === 'renter'
                          ? (theme === 'light' ? 'border-blue-600 bg-blue-50 text-slate-900 ring-1 ring-blue-600/35 shadow-sm' : 'border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500/40 shadow-sm')
                          : (theme === 'light' ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <KeyRound className={`h-4 w-4 shrink-0 ${accountType === 'renter' ? 'text-blue-500' : 'text-neutral-400'}`} />
                        <span>Customer to rent a car</span>
                      </div>
                      <div className={`text-[10px] mt-1 leading-snug ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                        Rent & drive cars for trips
                      </div>
                      {accountType === 'renter' && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Google Sign-Up Option for Selected Account Type */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignInOrSignUp(accountType)}
                  disabled={isSubmitting || isGoogleSubmitting}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-400 shadow-slate-100'
                      : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white hover:border-neutral-700'
                  }`}
                >
                  <GoogleIcon />
                  <span>
                    {isGoogleSubmitting
                      ? 'Connecting Google Account...'
                      : accountType === 'vehicle_owner'
                      ? 'Sign up with Google as Car Owner'
                      : 'Sign up with Google as Customer'}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative flex py-0.5 items-center">
                  <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}></div>
                  <span className={`flex-shrink mx-3 text-[10px] uppercase tracking-wider font-semibold ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`}>
                    or sign up with email details
                  </span>
                  <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}></div>
                </div>

                <form onSubmit={handleSignUpSubmit} className="space-y-4">

                {/* Common Fields */}
                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Email ID</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      placeholder="e.g. user@example.com"
                      className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                  }`}>Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-2.5 h-4 w-4 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-400' : 'text-neutral-500'
                    }`} />
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      required
                      value={signUpPassword}
                      onChange={e => setSignUpPassword(e.target.value)}
                      placeholder="Enter password (minimum 6 characters)"
                      className={`w-full rounded-lg border pl-9 pr-10 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className={`absolute right-3 top-2.5 p-0.5 rounded transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'text-slate-400 hover:text-slate-700'
                          : 'text-neutral-500 hover:text-neutral-200'
                      }`}
                      title={showSignUpPassword ? "Hide password" : "Show password"}
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Specific Input Fields */}
                {accountType === 'vehicle_owner' ? (
                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>
                      UPI ID for Rental Earnings (Optional)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okaxis"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                      theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
                    }`}>
                      Driving Licence Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={drivingLicense}
                      onChange={e => setDrivingLicense(e.target.value)}
                      placeholder="e.g. DL-0420210012345"
                      className={`w-full rounded-lg border px-3 py-2 text-xs transition-all duration-300 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                          : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs transition-colors shadow-lg disabled:opacity-50 cursor-pointer ${
                    accountType === 'vehicle_owner'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/10'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Creating Account...</span>
                  ) : accountType === 'vehicle_owner' ? (
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" />
                      <span>Register as Owner of a car</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Register as Customer to rent a car</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
            )}

          </div>
        </div>

      </main>

      {/* Password Reset Modal via Firebase Auth */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900 shadow-2xl' : 'border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>Password Reset</span>
              </h3>
              <button 
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetStatus(null);
                }} 
                className={`${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-white'} cursor-pointer`}
              >
                ✕
              </button>
            </div>

            {resetStatus && (
              <div className={`p-3 rounded-lg text-xs border ${
                resetStatus.type === 'success' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              }`}>
                {resetStatus.message}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className={`rounded-xl border p-3 text-xs transition-all duration-300 ${
                theme === 'light' ? 'border-emerald-200 bg-emerald-50/50 text-slate-800 shadow-sm' : 'border-emerald-500/20 bg-emerald-500/5 text-neutral-300'
              }`}>
                <p className="leading-relaxed text-[11px]">
                  🔒 <strong>Firebase Security:</strong> Enter your registered email address. Firebase Auth will dispatch an official password reset link directly to your inbox.
                </p>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Your Registered Email ID</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${theme === 'light' ? 'border-slate-100' : 'border-neutral-800'}`}>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    theme === 'light' ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                  }`}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isResetting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs px-4 transition-all duration-300 ${
        theme === 'light' ? 'border-slate-200 bg-white/80 text-slate-500' : 'border-neutral-800/80 bg-neutral-950/60 text-neutral-500'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GoDrive &middot; Vehicle Rental & Fleet System</span>
          <span className="font-mono text-[11px]">Strict Data Privacy & Safe Payouts</span>
        </div>
      </footer>

    </div>
  );
};
