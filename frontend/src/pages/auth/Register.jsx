import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { Mail, Lock, User } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('TRAVELER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await register(email, password, displayName, role);
      navigate('/');
    } catch (err) {
      console.error('Register error:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('This email is already registered.');
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email.');
      else setError(err.message || 'Something went wrong.');
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
            Start your<br />journey today.
          </h1>
          <p className="text-body-lg text-white/50">
            Create an account to plan trips, manage properties, or operate tours — all on one platform.
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
            <h2 className="text-display-sm text-ink mb-1">Create account</h2>
            <p className="text-body-sm text-text-secondary mb-6">Get started in less than a minute.</p>

            {error && (
              <div className="bg-danger-soft border border-danger/20 rounded-lg p-3 mb-5">
                <p className="text-[13px] text-danger">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Full name" type="text" required icon={User} placeholder="Jane Doe"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input label="Email" type="email" required icon={Mail} placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Password" type="password" required icon={Lock} placeholder="Min. 6 characters" minLength="6"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <Select label="I am a..." value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="TRAVELER">Traveler</option>
                <option value="HOTEL_ADMIN">Hotel Administrator</option>
                <option value="TOUR_OPERATOR">Tour Operator</option>
                <option value="PLATFORM_ADMIN">Platform Administrator</option>
              </Select>
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Create account
              </Button>
            </form>

            <p className="text-center text-[13px] text-text-secondary mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
