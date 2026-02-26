import { useEffect, useState } from 'react';
import { Edit3, Save, UserCircle2 } from 'lucide-react';

import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-medium text-ink text-right">{value || '-'}</span>
    </div>
  );
}

function toForm(profile) {
  return {
    display_name: profile?.display_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    address: profile?.address || '',
    bio: profile?.bio || '',
  };
}

export default function TravelerProfile() {
  const { refreshUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(toForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      const data = res?.data?.data || {};
      setProfile(data);
      setForm(toForm(data));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        display_name: form.display_name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        bio: form.bio,
      };

      const res = await api.put('/auth/me', payload);
      const updated = res?.data?.data || {};
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSuccess('Profile updated successfully.');
      await refreshUserProfile();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(toForm(profile));
    setEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-sunken rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md text-ink">Profile</h1>
          <p className="text-body-sm text-text-secondary mt-1">View and update your traveler profile.</p>
        </div>
        {!editing ? (
          <Button icon={Edit3} onClick={() => setEditing(true)}>Edit profile</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>Save</Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/20 rounded-lg p-3">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3">
          <p className="text-[13px] text-success">{success}</p>
        </div>
      )}

      {!editing ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-surface-sunken">
                <UserCircle2 className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              </div>
              <h3 className="text-label-lg text-ink">Account</h3>
            </div>
            <div className="space-y-3">
              <ProfileRow label="Name" value={profile?.display_name} />
              <ProfileRow label="Email" value={profile?.email} />
              <ProfileRow label="Phone" value={profile?.phone} />
            </div>
          </Card>
          <Card>
            <h3 className="text-label-lg text-ink mb-4">Travel Details</h3>
            <div className="space-y-3">
              <ProfileRow label="City" value={profile?.city} />
              <ProfileRow label="Address" value={profile?.address} />
              <ProfileRow label="Bio" value={profile?.bio} />
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-label-lg text-ink mb-4">Account</h3>
            <div className="space-y-3">
              <Input
                label="Name"
                value={form.display_name}
                onChange={(e) => updateField('display_name', e.target.value)}
              />
              <Input
                label="Email"
                value={form.email}
                disabled
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
          </Card>
          <Card>
            <h3 className="text-label-lg text-ink mb-4">Travel Details</h3>
            <div className="space-y-3">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-ink">Bio</label>
                <textarea
                  className="
                    block w-full min-h-24 px-3 py-2
                    bg-white border border-border
                    rounded-lg text-[14px] text-ink placeholder-text-placeholder
                    outline-none transition-all duration-150
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                  "
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Tell us about your travel style."
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
