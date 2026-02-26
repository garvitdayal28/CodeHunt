import { useEffect, useMemo, useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';

import api from '../../api/axios';
import MenuItemCard from '../../components/restaurant/MenuItemCard';
import MenuItemForm, { EMPTY_MENU_FORM } from '../../components/restaurant/MenuItemForm';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

function toForm(item) {
    if (!item) return { ...EMPTY_MENU_FORM };
    return {
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        is_veg: item.is_veg !== false,
        servings: item.servings || '',
        category: item.category || '',
        images: item.images || [],
        is_available: item.is_available !== false,
    };
}

function formToPayload(form) {
    return {
        name: form.name,
        description: form.description,
        price: form.price,
        is_veg: form.is_veg,
        servings: form.servings,
        category: form.category,
        images: form.images || [],
        is_available: form.is_available,
    };
}

export default function MenuManagement() {
    const { currentUser } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState('');
    const [form, setForm] = useState({ ...EMPTY_MENU_FORM });
    const [deleteId, setDeleteId] = useState('');

    const isEditing = useMemo(() => Boolean(editingItemId), [editingItemId]);
    const menuPath = '/business/restaurant/menu';
    const uploadPath = '/business/restaurant/upload-image';

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get(menuPath);
            setItems(res?.data?.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load menu items.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreate = () => {
        setEditingItemId('');
        setForm({ ...EMPTY_MENU_FORM });
        setEditorOpen(true);
    };

    const openEdit = (item) => {
        setEditingItemId(item.id);
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
                const res = await api.put(`${menuPath}/${editingItemId}`, payload);
                const updated = res?.data?.data;
                setItems((prev) => prev.map((item) => (item.id === editingItemId ? updated : item)));
                setSuccess('Menu item updated successfully.');
            } else {
                const res = await api.post(menuPath, payload);
                const created = res?.data?.data;
                setItems((prev) => [created, ...prev]);
                setSuccess('Menu item created successfully.');
            }
            setEditorOpen(false);
            setEditingItemId('');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save menu item.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            if (!deleteId) return;
            setError('');
            setSuccess('');
            await api.delete(`${menuPath}/${deleteId}`);
            setItems((prev) => prev.filter((item) => item.id !== deleteId));
            setDeleteId('');
            setSuccess('Menu item deleted successfully.');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to delete menu item.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-display-md text-ink">Menu Management</h1>
                    <p className="text-body-sm text-text-secondary mt-1">
                        Add and manage dishes on your restaurant menu with pricing, images and availability.
                    </p>
                </div>
                <Button icon={Plus} onClick={openCreate}>Add Dish</Button>
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
                    <UtensilsCrossed className="h-8 w-8 text-text-muted mx-auto" />
                    <p className="text-[15px] text-ink font-medium mt-3">No menu items yet</p>
                    <p className="text-[13px] text-text-secondary mt-1">Add your first dish to start building your restaurant menu.</p>
                    <div className="mt-4">
                        <Button icon={Plus} onClick={openCreate}>Add Dish</Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {items.map((item) => (
                        <MenuItemCard
                            key={item.id}
                            item={item}
                            onEdit={openEdit}
                            onDelete={setDeleteId}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                title={isEditing ? 'Edit Dish' : 'Add New Dish'}
                maxWidthClass="max-w-3xl"
                footer={(
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditorOpen(false)}>Cancel</Button>
                        <Button loading={saving} onClick={handleSave}>{isEditing ? 'Save Changes' : 'Add Dish'}</Button>
                    </div>
                )}
            >
                <div className="max-h-[68vh] overflow-y-auto pr-1">
                    <MenuItemForm
                        value={form}
                        onChange={setForm}
                        uploadFolder={currentUser?.uid
                            ? `tripallied/business/${currentUser.uid}/menu`
                            : 'tripallied/business/menu'}
                        uploadPath={uploadPath}
                    />
                </div>
            </Modal>

            <ConfirmModal
                open={Boolean(deleteId)}
                title="Delete Menu Item"
                message="This will permanently remove this dish from your menu. Do you want to continue?"
                onCancel={() => setDeleteId('')}
                onConfirm={handleDelete}
                confirmLabel="Delete"
                confirmVariant="danger"
            />
        </div>
    );
}
