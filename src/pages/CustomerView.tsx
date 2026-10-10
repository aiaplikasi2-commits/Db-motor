import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  Contact2,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import type { Customer } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface CustomerViewProps {
  customers: Customer[];
  userId: string;
  onSaveCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => Promise<void>;
  onDeleteCustomer: (customer: Customer) => Promise<void>;
  initialAddMode?: boolean;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  userId,
  onSaveCustomer,
  onDeleteCustomer,
  initialAddMode = false,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(initialAddMode);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Smart Contact Picker & Quick-Paste State
  const [showContactModal, setShowContactModal] = useState(false);
  const [pastedContactText, setPastedContactText] = useState('');

  // Contact Picker Support
  const isContactPickerSupported =
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator as any).contacts;

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setNotes(customer.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  /**
   * AMBIL DARI KONTAK HP:
   * 1. Coba Contact Picker API bawaan browser jika tersedia & diizinkan.
   * 2. Jika di iframe / diblokir izin / tidak didukung, buka dialog tempel cepat.
   */
  const handlePickFromContacts = async () => {
    if (isContactPickerSupported) {
      try {
        const contactsNav = (navigator as any).contacts;
        const contacts = await contactsNav.select(['name', 'tel'], { multiple: false });

        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name[0]) {
            setName(contact.name[0]);
          }
          if (contact.tel && contact.tel[0]) {
            const rawTel = contact.tel[0].replace(/[^\d+]/g, '');
            setPhone(rawTel);
          }
          return;
        }
      } catch (err: any) {
        console.warn('Native contact picker unavailable in current context (e.g. iframe policy):', err);
        // Fallback gracefully to quick-paste extractor
        setShowContactModal(true);
        return;
      }
    }

    // Direct fallback modal
    setShowContactModal(true);
  };

  /**
   * Ekstraksi Nama & Nomor Otomatis dari Teks Kontak
   */
  const handleApplyExtractedContact = (text: string) => {
    if (!text.trim()) return;

    // Deteksi nomor telepon (format Indonesia: 08..., +62..., 628...)
    const phoneRegex = /(?:\+?62|0)[0-9\s\-]{8,15}/;
    const phoneMatch = text.match(phoneRegex);
    let extractedPhone = '';
    let remainingText = text;

    if (phoneMatch) {
      extractedPhone = phoneMatch[0].replace(/[^\d+]/g, '');
      remainingText = text
        .replace(phoneMatch[0], '')
        .replace(/nama\s*:\s*/i, '')
        .replace(/telp?\s*:\s*/i, '')
        .replace(/hp\s*:\s*/i, '')
        .replace(/wa\s*:\s*/i, '')
        .replace(/[\-:,]/g, ' ')
        .trim();
    }

    if (extractedPhone) {
      setPhone(extractedPhone);
    }

    if (remainingText) {
      const lines = remainingText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 0) {
        setName(lines[0]);
        if (lines.length > 1 && !notes) {
          setNotes(lines.slice(1).join(' '));
        }
      }
    }

    setShowContactModal(false);
    setPastedContactText('');
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setPastedContactText(clipText);
          handleApplyExtractedContact(clipText);
        }
      }
    } catch {
      // Browser blocked clipboard read permission; user can paste manually into textarea
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama customer wajib diisi');
      return;
    }
    if (!phone.trim()) {
      setFormError('Nomor telepon/WhatsApp wajib diisi');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onSaveCustomer(
        {
          userId,
          name: name.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        },
        editingCustomer?.id
      );
      handleCloseForm();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteCustomer(customerToDelete);
      setCustomerToDelete(null);
    } catch (err: any) {
      alert(`Gagal menghapus customer: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Add Button */}
      {!isFormOpen && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Database Customer ({customers.length})
              </h2>
              <p className="text-xs text-slate-500">Kelola prospek & calon pembeli motor</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="py-2.5 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              TAMBAH
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari customer (nama, nomor HP, minat motor)..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* FORM TAMBAH / EDIT CUSTOMER */}
      {isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handleCloseForm}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" /> Batal
            </button>
            <h3 className="font-extrabold text-sm text-slate-900">
              {editingCustomer ? 'Edit Data Customer' : 'Tambah Customer Baru'}
            </h3>
            <span className="w-10" />
          </div>

          {/* AMBIL DARI KONTAK HP BUTTON */}
          <button
            type="button"
            onClick={handlePickFromContacts}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Contact2 className="w-4 h-4 text-orange-400" />
            AMBIL DARI KONTAK HP
          </button>

          <form onSubmit={handleSave} className="space-y-3.5">
            {/* 1. Nama Customer */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nama Lengkap Customer *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pak Budi Santoso"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* 2. Nomor Telepon / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nomor WhatsApp / Telepon *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* 3. Catatan Opsional (Minat Motor) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan Minat Motor (Opsional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Minat Vario 160 warna hitam, budget 20-21 jt, minta infokan kalau ada barang baru."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {formError}
              </p>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    SIMPAN CUSTOMER
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DAFTAR CUSTOMER */}
      {!isFormOpen && (
        <div className="space-y-2.5">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? 'Tidak ada customer yang sesuai dengan pencarian.'
                  : 'Belum ada data customer tersimpan.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Tambah Customer Pertama
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const cleanPhone = c.phone.replace(/\D/g, '');
              const waNumber = cleanPhone.startsWith('0')
                ? `62${cleanPhone.slice(1)}`
                : cleanPhone;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {c.name}
                      </h4>
                      <p className="text-xs font-mono font-medium text-slate-600 mt-0.5">
                        {c.phone}
                      </p>
                    </div>

                    {/* Direct Contact Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://wa.me/${waNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-2xs active:scale-95 transition"
                        title="Chat WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${c.phone}`}
                        className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs active:scale-95 transition"
                        title="Telepon Langsung"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Notes / Interest */}
                  {c.notes && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">{c.notes}</p>
                    </div>
                  )}

                  {/* Bottom Actions: Edit & Delete */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Tersimpan di Firestore</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(c)}
                        className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <ConfirmationModal
          title="Hapus Data Customer?"
          message={`Apakah Anda yakin ingin menghapus customer "${customerToDelete.name}" (${customerToDelete.phone}) dari database?`}
          confirmLabel="Ya, Hapus"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setCustomerToDelete(null)}
        />
      )}

      {/* Smart Contact Input / Clipboard Extraction Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Contact2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Ambil Data Kontak</h3>
                  <p className="text-[10px] text-slate-500">Salin & tempel nama + nomor telepon</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Salin teks kontak dari WhatsApp atau Buku Telepon, lalu tempel di bawah. Sistem akan otomatis memisahkan nama dan nomor:
              </p>

              {/* Paste from Clipboard quick button */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Tempel dari Clipboard (Papan Klip)
              </button>

              <textarea
                rows={3}
                value={pastedContactText}
                onChange={(e) => setPastedContactText(e.target.value)}
                placeholder="Contoh: Pak Budi Santoso 08123456789 atau kartu kontak WA..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleApplyExtractedContact(pastedContactText)}
                disabled={!pastedContactText.trim()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4 text-orange-400" />
                Gunakan Data Kontak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
