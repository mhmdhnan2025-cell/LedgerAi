import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  Tag,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  X,
  Edit3,
  Landmark,
} from 'lucide-react';
import { CompanyProfile } from '../types';

interface CompanyRegistrationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onRegistered: (company: CompanyProfile) => void;
  initialCompany?: CompanyProfile | null;
  isDismissible?: boolean;
}

const BUSINESS_CATEGORIES = [
  'Wholesale Food & Grains',
  'Restaurant Supplies & Kitchen Staples',
  'FMCG & Provision Distribution',
  'General Wholesale & Trading',
  'Fresh Produce & Vegetables',
  'Meat & Poultry Wholesale',
  'Packaging & Kitchen Materials',
  'Other Commercial Trading',
];

const POPULAR_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Gujranwala',
];

export const CompanyRegistrationModal: React.FC<CompanyRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
  initialCompany,
  isDismissible = false,
}) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_CATEGORIES[0]);
  const [ntn, setNtn] = useState('');
  const [tagline, setTagline] = useState('');
  const [notes, setNotes] = useState('');
  const [poBox, setPoBox] = useState('');
  const [trn, setTrn] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [nameAr, setNameAr] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [iban, setIban] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCompany) {
      setName(initialCompany.name || '');
      setOwnerName(initialCompany.ownerName || '');
      setPhone(initialCompany.phone || '');
      setEmail(initialCompany.email || '');
      setCity(initialCompany.city || 'Lahore');
      setAddress(initialCompany.address || '');
      setBusinessType(initialCompany.businessType || BUSINESS_CATEGORIES[0]);
      setNtn(initialCompany.ntn || '');
      setTagline(initialCompany.tagline || '');
      setNotes(initialCompany.notes || '');
      setPoBox(initialCompany.poBox || '');
      setTrn(initialCompany.trn || '');
      setCurrency(initialCompany.currency || 'PKR');
      setNameAr(initialCompany.nameAr || '');
      setBankAccountTitle(initialCompany.bankAccountTitle || '');
      setBankName(initialCompany.bankName || '');
      setBankAccountNo(initialCompany.bankAccountNo || '');
      setIban(initialCompany.iban || '');
    } else {
      // Default placeholder values for smooth start
      setName('');
      setOwnerName('');
      setPhone('');
      setEmail('');
      setCity('Lahore');
      setAddress('');
      setBusinessType(BUSINESS_CATEGORIES[0]);
      setNtn('');
      setTagline('');
      setNotes('');
      setPoBox('');
      setTrn('');
      setCurrency('PKR');
      setNameAr('');
      setBankAccountTitle('');
      setBankName('');
      setBankAccountNo('');
      setIban('');
    }
    setError(null);
  }, [initialCompany, isOpen]);

  if (!isOpen) return null;

  const handleFillPreset = () => {
    setName('Hanan Wholesale Traders');
    setOwnerName('Muhammad Hanan');
    setPhone('0300-4567890');
    setEmail('hanantraders@ledger.pk');
    setCity('Lahore');
    setAddress('Shop # 14, Main Ghalla Mandi, Badami Bagh');
    setBusinessType('Wholesale Food & Grains');
    setTagline('Commercial Restaurant Supplies & Bulk Grain Distributor');
    setNtn('NTN-8942103-7');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedOwner = ownerName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Company / Legal business name is required.');
      return;
    }
    if (!trimmedOwner) {
      setError('Proprietor / Director name is required.');
      return;
    }
    if (!trimmedPhone) {
      setError('Official phone / WhatsApp number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = initialCompany?.isRegistered ? '/api/company' : '/api/company/register';
      const method = initialCompany?.isRegistered ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          ownerName: trimmedOwner,
          phone: trimmedPhone,
          email: email.trim(),
          city: city.trim(),
          address: address.trim(),
          businessType,
          ntn: ntn.trim(),
          tagline: tagline.trim(),
          notes: notes.trim(),
          poBox: poBox.trim(),
          trn: trn.trim(),
          currency: currency.trim() || 'PKR',
          nameAr: nameAr.trim(),
          bankAccountTitle: bankAccountTitle.trim(),
          bankName: bankName.trim(),
          bankAccountNo: bankAccountNo.trim(),
          iban: iban.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Registration failed. Please check your credentials.');
      }

      const data = await res.json();
      if (data.company) {
        onRegistered(data.company);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(initialCompany?.isRegistered);

  return (
    <div
      id="company-registration-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="company-registration-modal-card"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-emerald-950/90 border-b border-slate-700/80 p-5 sm:p-6 text-white relative">
          {isDismissible && onClose && (
            <button
              id="btn-close-company-modal"
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800">
                  {isEditing ? 'Business Profile' : 'Step 1 &bull; Company Setup'}
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> AI Digital Ledger
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                {isEditing ? 'Company Profile & Settings' : 'Register Your Business Company'}
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {isEditing
              ? 'Update your official business name, registered owner, contact numbers, and letterhead details.'
              : 'Configure your company details so that all automated ledger entries, invoices, vouchers, and audit reports are branded under your official business name.'}
          </p>

          {!isEditing && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                id="btn-quick-fill-preset"
                onClick={handleFillPreset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 border border-indigo-700/60 px-2.5 py-1.5 rounded-lg transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Auto-Fill Sample Company (Hanan Wholesale Traders)
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-200">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs sm:text-sm rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          {/* Company Name & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Company / Business Legal Name <span className="text-red-400">*</span>
              </label>
              <input
                id="input-company-name"
                type="text"
                required
                placeholder="e.g., Hanan Wholesale Traders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Tagline / Business Slogan (Optional)
              </label>
              <input
                id="input-company-tagline"
                type="text"
                placeholder="e.g., Wholesale Food & Restaurant Supplies"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Owner Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Proprietor / Managing Director <span className="text-red-400">*</span>
              </label>
              <input
                id="input-company-owner"
                type="text"
                required
                placeholder="e.g., Muhammad Hanan"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Official Mobile / WhatsApp Number <span className="text-red-400">*</span>
              </label>
              <input
                id="input-company-phone"
                type="text"
                required
                placeholder="e.g., +92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Business Category & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                Industry / Business Category
              </label>
              <select
                id="select-company-category"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                City / Head Office Location <span className="text-red-400">*</span>
              </label>
              <div className="space-y-1.5">
                <input
                  id="input-company-city"
                  type="text"
                  required
                  placeholder="e.g., Lahore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <div className="flex flex-wrap gap-1">
                  {POPULAR_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition ${
                        city.toLowerCase() === c.toLowerCase()
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shop Address & NTN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Complete Commercial Address
              </label>
              <input
                id="input-company-address"
                type="text"
                placeholder="e.g., Shop #14, Main Wholesale Market"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Tax Registration / NTN (Optional)
              </label>
              <input
                id="input-company-ntn"
                type="text"
                placeholder="e.g., NTN-1234567-8"
                value={ntn}
                onChange={(e) => setNtn(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Tax Invoice Letterhead Extras (P.O. Box, TRN, Arabic Name) */}
          <div className="pt-1 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pt-3 pb-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Tax Invoice Letterhead Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">P.O. Box (Optional)</label>
                <input
                  id="input-company-pobox"
                  type="text"
                  placeholder="e.g., 37758, Dubai - UAE"
                  value={poBox}
                  onChange={(e) => setPoBox(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">TRN / VAT Registration (Optional)</label>
                <input
                  id="input-company-trn"
                  type="text"
                  placeholder="e.g., 105116690600003"
                  value={trn}
                  onChange={(e) => setTrn(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Currency on Tax Invoice</label>
                <select
                  id="select-company-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition"
                >
                  {['AED', 'PKR', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'USD', 'EUR', 'GBP', 'INR'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1" dir="rtl">اسم الشركة بالعربية (Optional)</label>
                <input
                  id="input-company-name-ar"
                  type="text"
                  dir="rtl"
                  placeholder="زھرة الفجر"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Bank Details for Payment (printed on Tax Invoice) */}
          <div className="pt-1 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pt-3 pb-2">
              <Landmark className="w-3.5 h-3.5 text-indigo-400" />
              Bank Details for Payment (printed on bill)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">A/C Title / Payee Name</label>
                <input
                  id="input-company-bank-title"
                  type="text"
                  placeholder="e.g., ZAHRAT AL FAJR FOODSTUFF TRADING LLC SP"
                  value={bankAccountTitle}
                  onChange={(e) => setBankAccountTitle(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bank Name</label>
                <input
                  id="input-company-bank-name"
                  type="text"
                  placeholder="e.g., EMIRATES NBD BANK"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">A/C Number</label>
                <input
                  id="input-company-bank-account"
                  type="text"
                  placeholder="e.g., 1015873362501"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">IBAN Number</label>
                <input
                  id="input-company-iban"
                  type="text"
                  placeholder="e.g., AE710260001015873362501"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Live Seal / Letterhead Preview */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
              <span>Official Letterhead & Bill Voucher Header Preview</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Real-time Format
              </span>
            </div>
            <div className="bg-white text-slate-900 p-3 rounded-lg border border-slate-300 shadow-inner text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight text-slate-950">
                    {name.trim() || 'YOUR COMPANY LEGAL NAME'}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {tagline.trim() || businessType}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {address.trim() ? `${address.trim()}, ` : ''}{city || 'Pakistan'}
                    {ntn.trim() ? ` &bull; NTN: ${ntn.trim()}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Official AI Ledger</span>
                  <p className="font-bold text-[11px] text-indigo-700">{ownerName.trim() || 'Proprietor'}</p>
                  <p className="text-[10px] text-slate-600">{phone.trim() || '+92 300 0000000'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            {isDismissible && onClose && (
              <button
                type="button"
                id="btn-cancel-company-modal"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              id="btn-submit-company-registration"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Update Business Profile</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Complete Registration & Open Ledger</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
