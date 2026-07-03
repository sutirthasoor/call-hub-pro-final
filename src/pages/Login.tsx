import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Phone, Users, BarChart3, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Lead Management',
    description: 'Track and convert prospective clients into customers',
  },
  {
    icon: Phone,
    title: 'Call Management',
    description: 'Intelligently manage and track all your call activities',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Monitor revenue, conversion, and satisfaction metrics',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security for all your client data',
  },
];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify({
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: userCred.user.displayName,
        photoURL: userCred.user.photoURL,
      }));
      
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      // Simplify Firebase error messages
      if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
        setError('Invalid email or password. Please try again.');
      } else if (message.includes('too-many-requests')) {
        setError('Too many failed attempts. Please try again later.');
      } else if (message.includes('network-request-failed')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'hsl(221 70% 22%)' }}
      >
        {/* Background decorative circles */}
        <div
          className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-10"
          style={{ background: 'hsl(213 90% 55%)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full opacity-10"
          style={{ background: 'hsl(213 90% 55%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'hsl(213 90% 70%)' }}
        />

        {/* Logo / Brand */}
        <div className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: 'hsl(213 90% 48%)' }}
            >
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg leading-tight tracking-tight">
                Call Hub Pro
              </p>
              <p className="text-blue-300 text-xs font-medium tracking-wider uppercase">
                Enterprise Solutions
              </p>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-white text-4xl font-bold leading-tight tracking-tight mb-4">
            Call Management
            <br />
            <span style={{ color: 'hsl(213 90% 68%)' }}>CRM Platform</span>
          </h1>
          <p className="text-blue-200 text-base font-normal leading-relaxed max-w-sm mb-10">
            Manage leads, track calls, and grow your business — all from one powerful dashboard.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 animate-fade-in"
                  style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg mt-0.5"
                    style={{ background: 'hsl(221 60% 30%)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: 'hsl(213 90% 68%)' }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-snug">
                      {feature.title}
                    </p>
                    <p className="text-blue-300 text-xs font-normal leading-relaxed mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 animate-fade-in" style={{ animationDelay: '0.55s' }}>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'hsl(221 60% 30%)' }}
          >
            <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(213 90% 68%)' }} />
            <p className="text-blue-200 text-xs">
              Access is restricted to authorised staff only. Contact your administrator to request access.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in" style={{ animationDelay: '0.05s' }}>

          {/* Mobile logo (only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'hsl(221 70% 35%)' }}
            >
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base leading-tight">Call Hub Pro</p>
              <p className="text-muted-foreground text-xs">Enterprise Solutions</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl border border-border shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@callhubpro.com"
                  className="
                    w-full px-3.5 py-2.5 rounded-lg border border-input bg-background
                    text-sm text-foreground placeholder:text-muted-foreground
                    transition-colors duration-150
                    outline-none focus:outline-none focus:ring-0
                    focus:border-primary
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="
                      w-full px-3.5 py-2.5 pr-11 rounded-lg border border-input bg-background
                      text-sm text-foreground placeholder:text-muted-foreground
                      transition-colors duration-150
                      outline-none focus:outline-none focus:ring-0
                      focus:border-primary
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      text-muted-foreground hover:text-foreground
                      transition-colors duration-150 p-0.5
                    "
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 px-3.5 py-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-destructive mt-1.5" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              {/* Forgot password */}
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:text-accent transition-colors duration-150"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="
                  w-full flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-lg
                  text-sm font-semibold text-primary-foreground
                  transition-all duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  active:scale-[0.98]
                "
                style={{ background: 'hsl(var(--primary))' }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent))';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--primary))';
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account?{' '}
            <span className="font-medium text-foreground">
              Contact your administrator
            </span>{' '}
            to get access.
          </p>
        </div>
      </div>
    </div>
  );
}