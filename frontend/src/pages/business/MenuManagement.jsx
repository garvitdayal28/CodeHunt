import { useEffect, useMemo, useState } from "react";
import { Plus, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import api from "../../api/axios";
import MenuItemCard from "../../components/restaurant/MenuItemCard";
import MenuItemForm, {
  EMPTY_MENU_FORM,
} from "../../components/restaurant/MenuItemForm";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

function toForm(item) {
  if (!item) return { ...EMPTY_MENU_FORM };
  return {
    name: item.name || "",
    description: item.description || "",
    price: item.price?.toString() || "",
    is_veg: item.is_veg !== false,
    servings: item.servings || "",
    category: item.category || "",
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
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_MENU_FORM });
  const [deleteId, setDeleteId] = useState("");

  const isEditing = useMemo(() => Boolean(editingItemId), [editingItemId]);
  const menuPath = "/business/restaurant/menu";
  const uploadPath = "/business/restaurant/upload-image";

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(menuPath);
      setItems(res?.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (error) toast.error("Menu", error);
  }, [error, toast]);

  useEffect(() => {
    if (success) toast.success("Menu", success);
  }, [success, toast]);

  const openCreate = () => {
    setEditingItemId("");
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
      setError("");
      setSuccess("");
      const payload = formToPayload(form);
      if (isEditing) {
        const res = await api.put(`${menuPath}/${editingItemId}`, payload);
        const updated = res?.data?.data;
        setItems((prev) =>
          prev.map((item) => (item.id === editingItemId ? updated : item)),
        );
        setSuccess("Menu item updated successfully.");
      } else {
        const res = await api.post(menuPath, payload);
        const created = res?.data?.data;
        setItems((prev) => [created, ...prev]);
        setSuccess("Menu item created successfully.");
      }
      setEditorOpen(false);
      setEditingItemId("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save menu item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteId) return;
      setError("");
      setSuccess("");
      await api.delete(`${menuPath}/${deleteId}`);
      setItems((prev) => prev.filter((item) => item.id !== deleteId));
      setDeleteId("");
      setSuccess("Menu item deleted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete menu item.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Menu Management"
        description="Add and manage dishes on your restaurant menu with pricing, images and availability."
        action={(
          <Button icon={Plus} onClick={openCreate}>
            Add Dish
          </Button>
        )}
      />

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-danger-soft border border-danger/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-danger">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-success/10 border border-success/20 rounded-lg p-3 overflow-hidden"
          >
            <p className="text-[13px] text-success">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <SkeletonCard key={idx} className="h-56" bodyLines={2} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border bg-white p-4"
        >
          <EmptyState
            icon={UtensilsCrossed}
            title="No menu items yet"
            description="Add your first dish to start building your restaurant menu."
            action={(
              <Button icon={Plus} onClick={openCreate}>
                Add Dish
              </Button>
            )}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MenuItemCard
                  item={item}
                  onEdit={openEdit}
                  onDelete={setDeleteId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={isEditing ? "Edit Dish" : "Add New Dish"}
        maxWidthClass="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {isEditing ? "Save Changes" : "Add Dish"}
            </Button>
          </div>
        }
      >
        <div className="max-h-[68vh] overflow-y-auto pr-1">
          <MenuItemForm
            value={form}
            onChange={setForm}
            uploadFolder={
              currentUser?.uid
                ? `tripallied/business/${currentUser.uid}/menu`
                : "tripallied/business/menu"
            }
            uploadPath={uploadPath}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete Menu Item"
        message="This will permanently remove this dish from your menu. Do you want to continue?"
        onCancel={() => setDeleteId("")}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        intent="danger"
      />
    </motion.div>
  );
}
