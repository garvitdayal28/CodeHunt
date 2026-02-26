import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-hero-gradient">
      {/* Left Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src="/Logo-removedbg.png" alt="TripAllied" className="h-10 w-10 object-contain" />
            <span className="text-[22px] font-semibold text-white tracking-tight">TripAllied</span>
          </div>
          <h1 className="text-display-xl text-white mb-4">
            Travel planning,<br />fully in sync.
          </h1>
          <p className="text-body-lg text-white/50">
            Hotels, tours, and activities in one place.<br />When plans change, every stakeholder knows instantly.
          </p>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src="/Logo-removedbg.png" alt="TripAllied" className="h-9 w-9 object-contain" />
            <span className="text-[18px] font-semibold text-white">TripAllied</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-display-sm text-ink mb-1">Welcome back</h2>
            <p className="text-body-sm text-text-secondary mb-6">Sign in to your account to continue.</p>

            {error && (
              <div className="bg-danger-soft border border-danger/20 rounded-lg p-3 mb-5">
                <p className="text-[13px] text-danger">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" required icon={Mail} placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" type="password" required icon={Lock} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>

            <p className="text-center text-[13px] text-text-secondary mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:text-primary-hover transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
