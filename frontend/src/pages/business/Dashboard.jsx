import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit3, Save, Star } from 'lucide-react';

import api from '../../api/axios';
import BusinessEditableCard from '../../components/business/BusinessEditableCard';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input, { Select } from '../../components/ui/Input';
import {
  BUSINESS_TYPES,
  GUIDE_SERVICE_OPTIONS,
  buildBusinessProfilePayload,
  businessProfileToForm,
  createEmptyBusinessForm,
} from '../../constants/business';

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[13px] font-medium text-ink text-right">{value || '-'}</span>
    </div>
  );
}

function prettyBusinessType(type) {
  if (!type) return '-';
  return type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BusinessDashboard() {
  const [displayName, setDisplayName] = useState('');
  const [businessForm, setBusinessForm] = useState(createEmptyBusinessForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateBusinessField = (field, value) => {
    setBusinessForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetFromProfile = (profile) => {
    setDisplayName(profile?.display_name || '');
    setBusinessForm(businessProfileToForm(profile?.business_profile));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/business/profile');
        resetFromProfile(res?.data?.data);
      } catch (err) {
        const backendMessage = err?.response?.data?.message;
        setError(backendMessage || 'Failed to load business profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const summaryRows = useMemo(() => ([
    { label: 'Profile name', value: displayName },
    { label: 'Business type', value: prettyBusinessType(businessForm.businessType) },
    { label: 'Business name', value: businessForm.businessName },
    { label: 'Phone', value: businessForm.phone },
    { label: 'City', value: businessForm.city },
    { label: 'Address', value: businessForm.address },
  ]), [displayName, businessForm]);

  const detailsRows = useMemo(() => {
    if (businessForm.businessType === 'HOTEL') {
      return [
        { label: 'Total rooms', value: businessForm.totalRooms },
        { label: 'Amenities', value: businessForm.amenities },
      ];
    }
    if (businessForm.businessType === 'RESTAURANT') {
      return [
        { label: 'Cuisine', value: businessForm.cuisine },
        { label: 'Opening hours', value: businessForm.openingHours },
        { label: 'Seating capacity', value: businessForm.seatingCapacity },
      ];
    }
    if (businessForm.businessType === 'CAB_DRIVER') {
      return [
        { label: 'Driver name', value: businessForm.driverName },
        { label: 'Vehicle type', value: businessForm.vehicleType },
        { label: 'Vehicle number', value: businessForm.vehicleNumber },
        { label: 'License number', value: businessForm.licenseNumber },
        { label: 'Service area', value: businessForm.serviceArea },
      ];
    }
    return [
      { label: 'Guide/Service name', value: businessForm.guideName },
      { label: 'Years experience', value: businessForm.yearsExperience },
      { label: 'Languages', value: businessForm.languages },
      { label: 'Service categories', value: (businessForm.serviceCategories || []).join(', ') },
      { label: 'Certifications', value: businessForm.certifications },
    ];
  }, [businessForm]);

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      setSaving(true);

      const businessProfile = buildBusinessProfilePayload(businessForm);
      await api.put('/business/profile', {
        display_name: displayName,
        business_profile: businessProfile,
      });

      setEditing(false);
      setSuccess('Business details updated successfully.');
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      setError('');
      const res = await api.get('/business/profile');
      resetFromProfile(res?.data?.data);
      setEditing(false);
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || 'Failed to reset profile.');
    }
  };

  const toggleServiceCategory = (service) => {
    const next = businessForm.serviceCategories.includes(service)
      ? businessForm.serviceCategories.filter((item) => item !== service)
      : [...businessForm.serviceCategories, service];
    updateBusinessField('serviceCategories', next);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-surface-sunken rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-56 bg-surface-sunken rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md text-ink">Business Dashboard</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            View your profile in cards and edit only when needed.
          </p>
        </div>
        {!editing ? (
          <Button icon={Edit3} onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Save
            </Button>
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
                <Building2 className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              </div>
              <h3 className="text-label-lg text-ink">Basic Information</h3>
            </div>
            <div className="space-y-3">
              {summaryRows.map((row) => <ProfileRow key={row.label} label={row.label} value={row.value} />)}
            </div>
          </Card>

          <Card>
            <h3 className="text-label-lg text-ink mb-4">Business Details</h3>
            <div className="space-y-3">
              {detailsRows.map((row) => <ProfileRow key={row.label} label={row.label} value={row.value} />)}
              <ProfileRow label="Description" value={businessForm.description} />
              {businessForm.businessType === 'TOURIST_GUIDE_SERVICE' && (
                <ProfileRow label="Personal bio" value={businessForm.personalBio} />
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BusinessEditableCard title="Basic Information" icon={Building2}>
            <Input
              label="Profile name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Select
              label="Business type"
              value={businessForm.businessType}
              onChange={(e) => updateBusinessField('businessType', e.target.value)}
            >
              {BUSINESS_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Input
              label="Business name"
              type="text"
              value={businessForm.businessName}
              onChange={(e) => updateBusinessField('businessName', e.target.value)}
              required
            />
            <Input
              label="Phone"
              type="text"
              value={businessForm.phone}
              onChange={(e) => updateBusinessField('phone', e.target.value)}
              required
            />
            <Input
              label="City"
              type="text"
              value={businessForm.city}
              onChange={(e) => updateBusinessField('city', e.target.value)}
              required
            />
            <Input
              label="Address"
              type="text"
              value={businessForm.address}
              onChange={(e) => updateBusinessField('address', e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-ink">Description</label>
              <textarea
                className="
                  block w-full min-h-24 px-3 py-2
                  bg-white border border-border
                  rounded-lg text-[14px] text-ink placeholder-text-placeholder
                  outline-none transition-all duration-150
                  focus:border-accent focus:ring-2 focus:ring-accent/20
                "
                value={businessForm.description}
                onChange={(e) => updateBusinessField('description', e.target.value)}
                placeholder="Tell travelers about your business."
              />
            </div>
          </BusinessEditableCard>

          <BusinessEditableCard title="Business Details" icon={Star}>
            {businessForm.businessType === 'HOTEL' && (
              <>
                <Input
                  label="Total rooms"
                  type="number"
                  min="1"
                  value={businessForm.totalRooms}
                  onChange={(e) => updateBusinessField('totalRooms', e.target.value)}
                  required
                />
                <Input
                  label="Amenities (comma separated)"
                  type="text"
                  value={businessForm.amenities}
                  onChange={(e) => updateBusinessField('amenities', e.target.value)}
                  placeholder="Pool, Wifi, Parking"
                />
              </>
            )}

            {businessForm.businessType === 'RESTAURANT' && (
              <>
                <Input
                  label="Cuisine"
                  type="text"
                  value={businessForm.cuisine}
                  onChange={(e) => updateBusinessField('cuisine', e.target.value)}
                  required
                />
                <Input
                  label="Opening hours"
                  type="text"
                  value={businessForm.openingHours}
                  onChange={(e) => updateBusinessField('openingHours', e.target.value)}
                  required
                />
                <Input
                  label="Seating capacity"
                  type="number"
                  min="1"
                  value={businessForm.seatingCapacity}
                  onChange={(e) => updateBusinessField('seatingCapacity', e.target.value)}
                  required
                />
              </>
            )}

            {businessForm.businessType === 'CAB_DRIVER' && (
              <>
                <Input
                  label="Driver name"
                  type="text"
                  value={businessForm.driverName}
                  onChange={(e) => updateBusinessField('driverName', e.target.value)}
                  required
                />
                <Input
                  label="Vehicle type"
                  type="text"
                  value={businessForm.vehicleType}
                  onChange={(e) => updateBusinessField('vehicleType', e.target.value)}
                  required
                />
                <Input
                  label="Vehicle number"
                  type="text"
                  value={businessForm.vehicleNumber}
                  onChange={(e) => updateBusinessField('vehicleNumber', e.target.value)}
                  required
                />
                <Input
                  label="License number"
                  type="text"
                  value={businessForm.licenseNumber}
                  onChange={(e) => updateBusinessField('licenseNumber', e.target.value)}
                  required
                />
                <Input
                  label="Service area"
                  type="text"
                  value={businessForm.serviceArea}
                  onChange={(e) => updateBusinessField('serviceArea', e.target.value)}
                  required
                />
              </>
            )}

            {businessForm.businessType === 'TOURIST_GUIDE_SERVICE' && (
              <>
                <Input
                  label="Guide/Service name"
                  type="text"
                  value={businessForm.guideName}
                  onChange={(e) => updateBusinessField('guideName', e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-ink">Personal bio</label>
                  <textarea
                    className="
                      block w-full min-h-24 px-3 py-2
                      bg-white border border-border
                      rounded-lg text-[14px] text-ink placeholder-text-placeholder
                      outline-none transition-all duration-150
                      focus:border-accent focus:ring-2 focus:ring-accent/20
                    "
                    value={businessForm.personalBio}
                    onChange={(e) => updateBusinessField('personalBio', e.target.value)}
                    placeholder="Experience, specialties, background."
                  />
                </div>
                <Input
                  label="Years of experience"
                  type="number"
                  min="0"
                  value={businessForm.yearsExperience}
                  onChange={(e) => updateBusinessField('yearsExperience', e.target.value)}
                  required
                />
                <Input
                  label="Languages (comma separated)"
                  type="text"
                  value={businessForm.languages}
                  onChange={(e) => updateBusinessField('languages', e.target.value)}
                />
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-ink">Services offered</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GUIDE_SERVICE_OPTIONS.map((service) => (
                      <label key={service} className="flex items-center gap-2 text-[13px] text-text-secondary">
                        <input
                          type="checkbox"
                          checked={businessForm.serviceCategories.includes(service)}
                          onChange={() => toggleServiceCategory(service)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                        />
                        {service}
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  label="Certifications (optional)"
                  type="text"
                  value={businessForm.certifications}
                  onChange={(e) => updateBusinessField('certifications', e.target.value)}
                />
              </>
            )}
          </BusinessEditableCard>
        </div>
      )}
    </div>
  );
}
