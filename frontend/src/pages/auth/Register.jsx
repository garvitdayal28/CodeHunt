import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';

import BusinessProfileFormFields from '../../components/business/BusinessProfileFormFields';
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { buildBusinessProfilePayload, createEmptyBusinessForm } from '../../constants/business';

export default function Register() {
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessForm, setBusinessForm] = useState(createEmptyBusinessForm());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const updateBusinessField = (field, value) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      const businessProfile = role === 'BUSINESS'
        ? buildBusinessProfilePayload(businessForm)
        : null;

      await register(email, password, displayName, role, businessProfile);
      navigate('/');
    } catch (err) {
      console.error('Register error:', err);
      const code = err?.code || '';
      const backendMessage = err?.response?.data?.message;
      if (code === 'auth/email-already-in-use') setError('This email is already registered.');
      else if (code === 'auth/weak-password') setError('Password must be at least 6 characters.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email.');
      else setError(backendMessage || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        <>
          Start your
          <br />
          journey today.
        </>
      }
      subtitle="Create an account to travel or run your business on TripAllied."
      maxWidthClass="max-w-xl"
    >
      <h2 className="text-display-md text-ink mb-2">Create account</h2>
      <p className="text-body-md text-text-secondary mb-8">Get started in less than a minute.</p>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Role"
          required
          inputSize="lg"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select role</option>
          <option value="TRAVELER">Traveller</option>
          <option value="BUSINESS">Business</option>
        </Select>

        <Input
          label="Full name"
          type="text"
          required
          icon={User}
          inputSize="lg"
          placeholder="Jane Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          icon={Mail}
          inputSize="lg"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          required
          icon={Lock}
          inputSize="lg"
          placeholder="Min. 6 characters"
          minLength="6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {role === 'BUSINESS' && (
          <div className="rounded-xl border border-border p-4 bg-surface-sunken/20">
            <p className="text-[13px] font-medium text-ink mb-3">Business details</p>
            <BusinessProfileFormFields form={businessForm} onChange={updateBusinessField} />
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </div>
      </form>

      <p className="text-center text-[13px] text-text-secondary mt-5">
        Already have an account?
        {' '}
        <Link to="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
