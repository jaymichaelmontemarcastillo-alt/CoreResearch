import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Lock, Mail, GraduationCap, UserCheck, Shield, Users, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, selectDevRole, loginWithGoogle } = useAuth();
  const navigate = useNavigate();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevRoleSelect = (role) => {
    selectDevRole(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Branding & Info */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <GraduationCap className="w-4 h-4" /> CoreResearch v1.0 MVP
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Student Research <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Streamline title proposals, adviser pairing, manuscript versioning, defense scheduling, and institutional repository archiving.
            </p>
          </div>

          {/* Role Badges List */}
          <div className="space-y-3 pt-2">
            <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Role-Based Access System</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 font-medium">Student Portal</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-medium">Adviser Desk</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 font-medium">Panelist Rubrics</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-medium">Admin Office</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card & Instant Demo Access */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-800">
            <div className="mb-6 text-left">
              <h2 className="text-xl font-bold text-white">Sign In to Your Account</h2>
              <p className="text-xs text-slate-400">Enter your university credentials to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await loginWithGoogle('student');
                    if (res?.needsOnboarding) {
                      navigate('/onboarding');
                    } else {
                      navigate('/dashboard');
                    }
                  } catch (err) {
                    if (err.code !== 'auth/popup-closed-by-user') {
                      setError(err.message || 'Google Sign-In failed.');
                    }
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition shadow-sm"
              >


                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Sign in with Google Account</span>
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">or sign in with email</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>


            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <Input
                label="University Email"
                type="email"
                placeholder="user@university.edu"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-blue-400 font-semibold hover:underline">
                Create an account
              </Link>
            </div>
          </Card>

          {/* Interactive Demo Mode Quick Switcher Card */}
          <Card className="border-blue-500/30 bg-blue-950/20">
            <div className="text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Demo Instant Access
                </span>
                <Badge variant="blue">1-Click Login</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Explore the workspace instantly under any of the 4 university roles:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => handleDevRoleSelect('student')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/50 text-left transition-all text-xs group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-blue-400 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" /> Student
                  </div>
                  <div className="text-[10px] text-slate-500">Alex Rivera</div>
                </button>

                <button
                  onClick={() => handleDevRoleSelect('adviser')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600/20 border border-slate-800 hover:border-emerald-500/50 text-left transition-all text-xs group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-emerald-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Adviser
                  </div>
                  <div className="text-[10px] text-slate-500">Dr. Vance</div>
                </button>

                <button
                  onClick={() => handleDevRoleSelect('panelist')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-purple-600/20 border border-slate-800 hover:border-purple-500/50 text-left transition-all text-xs group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-purple-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Panelist
                  </div>
                  <div className="text-[10px] text-slate-500">Prof. Chen</div>
                </button>

                <button
                  onClick={() => handleDevRoleSelect('admin')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-amber-600/20 border border-slate-800 hover:border-amber-500/50 text-left transition-all text-xs group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> Admin
                  </div>
                  <div className="text-[10px] text-slate-500">Dean Office</div>
                </button>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
