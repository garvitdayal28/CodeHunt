import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Plus } from 'lucide-react';

import api from '../../api/axios';
import RoomTypeCard from '../../components/hotel/RoomTypeCard';
import RoomTypeForm, { EMPTY_ROOM_FORM } from '../../components/hotel/RoomTypeForm';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

function toForm(room) {
  if (!room) return { ...EMPTY_ROOM_FORM };
  return {
    name: room.name || '',
    description: room.description || '',
    price_per_day: room.price_per_day?.toString() || '',
    total_rooms: room.total_rooms?.toString() || '',
    room_count_available: room.room_count_available?.toString() || '',
    beds: room.beds?.toString() || '',
    max_guests: room.max_guests?.toString() || '',
    area_sqft: room.area_sqft?.toString() || '',
    amenities: (room.amenities || []).join(', '),
    images: room.images || [],
  };
}

function formToPayload(form) {
  return {
    name: form.name,
    description: form.description,
    price_per_day: form.price_per_day,
    total_rooms: form.total_rooms,
    room_count_available: form.room_count_available || form.total_rooms,
    beds: form.beds,
    max_guests: form.max_guests || undefined,
    area_sqft: form.area_sqft || undefined,
    amenities: form.amenities,
    images: form.images || [],
  };
}

export default function RoomManagement() {
  const { currentUser, userRole, businessType } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [propertyId, setPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState('');
  const [form, setForm] = useState({ ...EMPTY_ROOM_FORM });
  const [deleteId, setDeleteId] = useState('');

  const isEditing = useMemo(() => Boolean(editingRoomId), [editingRoomId]);
  const isAdminHotelView = userRole === 'HOTEL_ADMIN' || userRole === 'PLATFORM_ADMIN';
  const isBusinessHotelView = userRole === 'BUSINESS' && businessType === 'HOTEL';
  const canManageRooms = isAdminHotelView || isBusinessHotelView;
  const roomsPath = isAdminHotelView ? '/admin/hotel/rooms' : '/business/hotel/rooms';
  const uploadPath = isAdminHotelView ? '/admin/hotel/upload-image' : '/business/hotel/upload-image';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      if (!canManageRooms) {
        setRooms([]);
        setPropertyId('');
        setError('Room management is available only for hotel accounts.');
        return;
      }

      if (isAdminHotelView) {
        const [profileRes, roomsRes] = await Promise.all([
          api.get('/admin/hotel/profile'),
          api.get('/admin/hotel/rooms'),
        ]);
        setPropertyId(profileRes?.data?.data?.id || '');
        setRooms(roomsRes?.data?.data || []);
      } else {
        const roomsRes = await api.get('/business/hotel/rooms');
        setPropertyId(currentUser?.uid || '');
        setRooms(roomsRes?.data?.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load room inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canManageRooms, isAdminHotelView, currentUser?.uid]);

  const openCreate = () => {
    setEditingRoomId('');
    setForm({ ...EMPTY_ROOM_FORM });
    setEditorOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoomId(room.id);
    setForm(toForm(room));
    setEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = formToPayload(form);
      if (isEditing) {
        const res = await api.put(`${roomsPath}/${editingRoomId}`, payload);
        const updated = res?.data?.data;
        setRooms((prev) => prev.map((room) => (room.id === editingRoomId ? updated : room)));
        setSuccess('Room type updated successfully.');
      } else {
        const res = await api.post(roomsPath, payload);
        const created = res?.data?.data;
        setRooms((prev) => [created, ...prev]);
        setSuccess('Room type created successfully.');
      }
      setEditorOpen(false);
      setEditingRoomId('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save room type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteId) return;
      setError('');
      setSuccess('');
      await api.delete(`${roomsPath}/${deleteId}`);
      setRooms((prev) => prev.filter((room) => room.id !== deleteId));
      setDeleteId('');
      setSuccess('Room type deleted successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete room type.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-md text-ink">Room Management</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Create room categories with pricing, inventory and photos for booking-ready listings.
          </p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add Room Type</Button>
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
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <BedDouble className="h-8 w-8 text-text-muted mx-auto" />
          <p className="text-[15px] text-ink font-medium mt-3">No room types created yet</p>
          <p className="text-[13px] text-text-secondary mt-1">Create your first room category to start selling inventory.</p>
          <div className="mt-4">
            <Button icon={Plus} onClick={openCreate}>Add Room Type</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <RoomTypeCard
              key={room.id}
              room={room}
              onEdit={openEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={isEditing ? 'Edit Room Type' : 'Create Room Type'}
        maxWidthClass="max-w-3xl"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{isEditing ? 'Save Changes' : 'Create Room Type'}</Button>
          </div>
        )}
      >
        <div className="max-h-[68vh] overflow-y-auto pr-1">
          <RoomTypeForm
            value={form}
            onChange={setForm}
            uploadFolder={isAdminHotelView
              ? (propertyId ? `tripallied/properties/${propertyId}/rooms` : 'tripallied/rooms')
              : (propertyId ? `tripallied/business/${propertyId}/rooms` : 'tripallied/business/rooms')}
            uploadPath={uploadPath}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete Room Type"
        message="This will remove the room type and its listing details. Do you want to continue?"
        onCancel={() => setDeleteId('')}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
