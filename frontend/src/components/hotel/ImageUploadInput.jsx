import { useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

import api from '../../api/axios';

export default function ImageUploadInput({
  label = 'Images',
  images = [],
  onChange,
  folder = 'tripallied/uploads',
  uploadPath = '/admin/hotel/upload-image',
  maxFiles = 8,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError('');
    setUploading(true);

    try {
      const allowed = files.slice(0, Math.max(0, maxFiles - images.length));
      const uploadedUrls = [];
      for (const file of allowed) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        const res = await api.post(uploadPath, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const secureUrl = res?.data?.data?.secure_url;
        if (secureUrl) uploadedUrls.push(secureUrl);
      }
      onChange([...(images || []), ...uploadedUrls]);
    } catch (err) {
      setError(err?.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (url) => {
    onChange((images || []).filter((item) => item !== url));
  };

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-ink">{label}</label>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-white text-[13px] cursor-pointer hover:bg-surface-sunken">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Upload Images'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
            disabled={uploading || images.length >= maxFiles}
          />
        </label>
        <span className="text-[12px] text-text-secondary">{images.length}/{maxFiles}</span>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((url) => (
            <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-white">
              <img src={url} alt="Uploaded" className="h-24 w-full object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/55 text-white inline-flex items-center justify-center"
                onClick={() => removeImage(url)}
                title="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
