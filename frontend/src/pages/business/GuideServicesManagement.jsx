import { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, Plus } from 'lucide-react';

import api from '../../api/axios';
import GuideServiceCard from '../../components/guide/GuideServiceCard';
import GuideServiceForm from '../../components/guide/GuideServiceForm';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_GUIDE_SERVICE_FORM = {
  service_type: 'ACTIVITY',
  name: '',
  description: '',
  location: '',
  duration_hours: '',
  price: '',
  price_unit: 'PER_PERSON',
  max_group_size: '',
  category: '',
  highlights: '',
  inclusions: '',
  images: [],
  is_active: true,
  difficulty_level: 'EASY',
  min_age: '',
  meeting_point: '',
  languages: '',
};

function toForm(service) {
  if (!service) return { ...EMPTY_GUIDE_SERVICE_FORM };
  return {
    service_type: service.service_type || 'ACTIVITY',
    name: service.name || '',
    description: service.description || '',
    location: service.location || '',
    duration_hours: service.duration_hours?.toString() || '',
    price: service.price?.toString() || '',
    price_unit: service.price_unit || 'PER_PERSON',
    max_group_size: service.max_group_size?.toString() || '',
    category: (service.category || []).join(', '),
    highlights: (service.highlights || []).join(', '),
    inclusions: (service.inclusions || []).join(', '),
    images: service.images || [],
    is_active: service.is_active !== false,
    difficulty_level: service.difficulty_level || 'EASY',
    min_age: service.min_age?.toString() || '',
    meeting_point: service.meeting_point || '',
    languages: (service.languages || []).join(', '),
  };
}

function toList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formToPayload(form) {
  const payload = {
    service_type: form.service_type,
    name: form.name,
    description: form.description,
    location: form.location,
    duration_hours: form.duration_hours,
    price: form.price,
    price_unit: form.price_unit,
    max_group_size: form.max_group_size || undefined,
    category: toList(form.category),
    highlights: toList(form.highlights),
    inclusions: toList(form.inclusions),
    images: form.images || [],
    is_active: form.is_active,
  };

  if (form.service_type === 'ACTIVITY') {
    payload.difficulty_level = form.difficulty_level;
    payload.min_age = form.min_age || undefined;
  } else {
    payload.meeting_point = form.meeting_point;
    payload.languages = toList(form.languages);
  }

  return payload;
}

export default function GuideServicesManagement() {
  const { currentUser, businessType } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ ...EMPTY_GUIDE_SERVICE_FORM });
  const [deleteId, setDeleteId] = useState('');

  const servicesPath = '/business/guide/services';
  const uploadPath = '/business/guide/upload-image';
  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const isGuideBusiness = businessType === 'TOURIST_GUIDE_SERVICE';

  const loadData = useCallback(async () => {
    if (!isGuideBusiness) {
      setLoading(false);
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.get(servicesPath);
      setItems(res?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load service packages.');
    } finally {
      setLoading(false);
    }
  }, [isGuideBusiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId('');
    setForm({ ...EMPTY_GUIDE_SERVICE_FORM });
    setEditorOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = formToPayload(form);
      if (isEditing) {
        const res = await api.put(`${servicesPath}/${editingId}`, payload);
        const updated = res?.data?.data;
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
        setSuccess('Service package updated successfully.');
      } else {
        const res = await api.post(servicesPath, payload);
        const created = res?.data?.data;
        setItems((prev) => [created, ...prev]);
        setSuccess('Service package created successfully.');
      }
      setEditorOpen(false);
      setEditingId('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save service package.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteId) return;
      setError('');
      setSuccess('');
      await api.delete(`${servicesPath}/${deleteId}`);
      setItems((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId('');
      setSuccess('Service package deleted successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete service package.');
    }
  };

  if (!isGuideBusiness) {
    return (
      <Card>
        <h1 className="text-display-sm text-ink mb-2">Manage Services</h1>
        <p className="text-body-sm text-text-secondary">
          This tab is available only for business accounts registered as Tourist Guide / Service.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md text-ink">Manage Services</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Create activity and guided-tour packages with images, pricing, and visibility control.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Package
        </Button>
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

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-52 bg-surface-sunken rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <Compass className="h-8 w-8 text-text-muted mx-auto" />
          <p className="text-[15px] text-ink font-medium mt-3">No service packages yet</p>
          <p className="text-[13px] text-text-secondary mt-1">
            Add your first activity or guided-tour package to start getting discovered.
          </p>
          <div className="mt-4">
            <Button icon={Plus} onClick={openCreate}>
              Add Package
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <GuideServiceCard
              key={item.id}
              service={item}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={isEditing ? 'Edit Service Package' : 'Create Service Package'}
        maxWidthClass="max-w-4xl"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Create Package'}
            </Button>
          </div>
        )}
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <GuideServiceForm
            value={form}
            onChange={setForm}
            uploadFolder={currentUser?.uid ? `tripallied/business/${currentUser.uid}/guide-services` : 'tripallied/business/guide-services'}
            uploadPath={uploadPath}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete Service Package"
        message="This will permanently remove this package. Do you want to continue?"
        onCancel={() => setDeleteId('')}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
