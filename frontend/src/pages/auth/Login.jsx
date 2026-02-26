import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AuthLayout from '../../components/layout/AuthLayout';
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
    <AuthLayout
      title={
        <>
          Travel planning,<br />fully in sync.
        </>
      }
      subtitle={
        <>
          Hotels, tours, and activities in one place.<br />When plans change, every stakeholder knows instantly.
        </>
      }
      maxWidthClass="max-w-sm"
    >
      <h2 className="text-display-md text-ink mb-2">Welcome back</h2>
      <p className="text-body-md text-text-secondary mb-8">Sign in to your account to continue.</p>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" required icon={Mail} placeholder="you@example.com"
          inputSize="lg" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" required icon={Lock} placeholder="••••••••"
          inputSize="lg" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="pt-2">
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </div>
      </form>

      <p className="text-center text-[13px] text-text-secondary mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:text-primary-hover transition-colors">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
