'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import type { Student, OLResult } from '../../types';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const RACES = [
  'Sinhala',
  'Tamil',
  'Indian Tamil',
  'Muslim',
  'Burgher',
  'Malay',
  'Other',
];

const RELIGIONS = [
  'Buddhism',
  'Hinduism',
  'Islam',
  'Christianity(RC/Non.RC)',
  'Other',
];

const GRADES = ['A', 'B', 'C', 'S', 'W', 'Absent'];

// Hardcoded subject groups (single-select each)
const MAIN_SUBJECTS = [
  'Engineering Technology',
  'Bio Systems Technology',
  'Science For Technology',
];

const BASKET_SUBJECTS = [
  'ICT',
  'Agricultural Science',
  'Mathematics',
  'Geography',
];

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Address & Contact', icon: MapPin },
  { id: 3, label: 'Parent Details', icon: User },
  { id: 4, label: 'O/L Results', icon: BookOpen },
  { id: 5, label: 'Subjects & Confirmation', icon: FileText },
];

type WizardPayload = Omit<
  Student,
  'id' | 'studentId' | 'attendance' | 'payments' | 'qrToken'
>;

type FormState = Omit<
  WizardPayload,
  'dob' | 'modules' | 'status' | 'enrolledAt'
> & {
  dob: string;
  modules: string[];
  subjects: string[];
  mainSubjects: string[];
  basketSubject: string;
  status: Student['status'];
  enrolledAt: string;
  confirmPassword: string;
  declarationRules: boolean;
  declarationAccuracy: boolean;
};

const emptyOL: OLResult = {
  year: '',
  indexNumber: '',
  english: '',
  mathematics: '',
  science: '',
  sinhala: '',
  tamil: '',
};

const emptyForm: FormState = {
  name: '',
  fullNameTamil: '',
  fullNameEnglish: '',
  dob: '',
  dateOfBirth: '',
  nicNo: '',
  address: '',
  school: '',
  whatsappNo: '',
  parentsNo: '',
  email: '',
  password: '',
  confirmPassword: '',
  permanentAddress: '',
  administrativeDistrict: '',
  fixedTelephone: '',
  residingSince: '',
  race: '',
  religion: '',
  contactAddress: '',
  postalCode: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  contactPerson: 'Mother',
  guardianAddress: '',
  guardianFixedTel: '',
  guardianMobile: '',
  olCategory: 'Local O/L',
  olYear: '',
  olIndexNumber: '',
  olNameUsed: '',
  olAccept: 'Accept',
  olResults: [{ ...emptyOL }],
  subjects: [],
  modules: [],
  mainSubjects: [],
  basketSubject: '',
  declarationAccepted: false,
  declarationRules: false,
  declarationAccuracy: false,
  phone: '',
  parentName: '',
  parentPhone: '',
  batch: '',
  status: 'pending',
  enrolledAt: new Date().toISOString(),
};

interface Props {
  modules: Array<{
    id?: string;
    _id?: string;
    name: string;
  }>;
  modulesLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: WizardPayload) => Promise<void>;
}

export default function StudentRegistrationWizard({
  modules,
  modulesLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    set(key, value);
  };

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 border ${
      err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
    } rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm`;

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.fullNameEnglish?.trim()) {
        nextErrors.fullNameEnglish = 'Full name English is required';
      }

      // Email
      if (!form.email.trim()) {
        nextErrors.email = 'Email is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          nextErrors.email = 'Enter a valid email address';
        }
      }

      // NIC — old format: 9 digits + V/X; new format: 12 digits
      if (!form.nicNo?.trim()) {
        nextErrors.nicNo = 'NIC number is required';
      } else {
        const oldNic = /^[0-9]{9}[vVxX]$/;
        const newNic = /^[0-9]{12}$/;
        if (!oldNic.test(form.nicNo) && !newNic.test(form.nicNo)) {
          nextErrors.nicNo = 'Enter a valid NIC (e.g. 991234567V or 199912345678)';
        }
      }

      // WhatsApp / phone — 9-10 digits
      if (!form.whatsappNo?.trim()) {
        nextErrors.whatsappNo = 'WhatsApp number is required';
      } else {
        const phoneRegex = /^[0-9]{9,10}$/;
        if (!phoneRegex.test(form.whatsappNo.replace(/\s/g, ''))) {
          nextErrors.whatsappNo = 'Enter a valid phone number (9–10 digits)';
        }
      }

      // Password strength
      if (!form.password) {
        nextErrors.password = 'Password is required';
      } else if (form.password.length < 8) {
        nextErrors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Z]/.test(form.password)) {
        nextErrors.password = 'Password must contain an uppercase letter';
      } else if (!/[0-9]/.test(form.password)) {
        nextErrors.password = 'Password must contain a number';
      }

      if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }

      // Date of birth — must be in the past, age 10–30
      if (!form.dob) {
        nextErrors.dob = 'Date of birth is required';
      } else {
        const dob = new Date(form.dob);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob >= today) {
          nextErrors.dob = 'Date of birth cannot be today or a future date';
        } else {
          const age = today.getFullYear() - dob.getFullYear();
          if (age < 10 || age > 30) {
            nextErrors.dob = 'Please verify the date of birth (expected age: 10–30 years)';
          }
        }
      }

      // Address
      if (!form.address?.trim()) {
        nextErrors.address = 'Address is required';
      }
    }

    if (step === 2) {
      if (!form.permanentAddress?.trim()) {
        nextErrors.permanentAddress = 'Permanent address is required';
      }
      if (!form.administrativeDistrict) {
        nextErrors.administrativeDistrict = 'District is required';
      }
    }

    if (step === 5) {
      if ((form.mainSubjects || []).length !== 2) {
        nextErrors.mainSubjects = 'Select exactly 2 main subjects';
      }
      if (!form.basketSubject) {
        nextErrors.basketSubject = 'Select one basket subject';
      }
      if (!form.declarationRules || !form.declarationAccuracy) {
        nextErrors.declaration = 'Both declarations are required';
      }
    }

    setErrors(nextErrors);

    const errKeys = Object.keys(nextErrors);
    if (errKeys.length > 0) {
      toast.error(nextErrors[errKeys[0]]);
    }

    return errKeys.length === 0;
  };

  const updateOlRow = (index: number, key: keyof OLResult, value: string) => {
    setForm((prev) => ({
      ...prev,
      olResults: (prev.olResults || []).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    }));
  };

  // Multi-select, max 2: clicking a third subject is blocked with an error
  const toggleMainSubject = (subject: string) => {
    const already = (form.mainSubjects || []).includes(subject);

    if (!already && (form.mainSubjects || []).length >= 2) {
      toast.error('Only 2 main subjects can be selected.');
      return;
    }

    const nextMain = already
      ? (form.mainSubjects || []).filter((s) => s !== subject)
      : [...(form.mainSubjects || []), subject];

    const combined = [...nextMain, form.basketSubject].filter(Boolean);

    setForm((prev) => ({
      ...prev,
      mainSubjects: nextMain,
      subjects: combined,
      modules: combined,
    }));
  };

  // Single-select: only one basket subject allowed. Same blocking behavior.
  const selectBasketSubject = (subject: string) => {
    if (form.basketSubject === subject) {
      const combined = [...(form.mainSubjects || [])].filter(Boolean);
      setForm((prev) => ({
        ...prev,
        basketSubject: '',
        subjects: combined,
        modules: combined,
      }));
      return;
    }

    if (form.basketSubject && form.basketSubject !== subject) {
      toast.error('Only one basket subject can be selected.');
      return;
    }

    const combined = [...(form.mainSubjects || []), subject].filter(Boolean);
    setForm((prev) => ({
      ...prev,
      basketSubject: subject,
      subjects: combined,
      modules: combined,
    }));
  };

  const submit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);

    const fullNameEnglish = form.fullNameEnglish?.trim() || form.name.trim();
    const selectedSubjects = [...(form.mainSubjects || []), form.basketSubject].filter(
      Boolean,
    );

    try {
      await onSubmit({
        ...form,
        name: fullNameEnglish,
        fullNameEnglish,
        phone: form.whatsappNo || form.phone,
        dateOfBirth: form.dateOfBirth || form.dob,
        dob: form.dob || form.dateOfBirth,
        parentName:
          form.motherName ||
          form.fatherName ||
          form.guardianName ||
          form.parentName,
        parentPhone: form.parentsNo || form.guardianMobile || form.parentPhone,
        declarationAccepted: form.declarationRules && form.declarationAccuracy,
        modules: selectedSubjects,
        subjects: selectedSubjects,
        enrolledAt: new Date().toISOString(),
      } as WizardPayload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((item) => {
          const Icon = item.icon;
          const active = step === item.id;
          const done = step > item.id;

          return (
            <div key={item.id} className="flex min-w-max items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                  done
                    ? 'border-green-500 bg-green-500 text-white'
                    : active
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-200 text-gray-400'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>

              <span
                className={`text-xs font-medium ${
                  active ? 'text-indigo-700' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ['fullNameTamil', 'Full Name Tamil'],
            ['fullNameEnglish', 'Full Name English'],
            ['nicNo', 'NIC Number'],
            ['school', 'School'],
            ['whatsappNo', 'WhatsApp No'],
            ['parentsNo', 'Parent No'],
            ['email', 'Email'],
            ['password', 'Password'],
            ['confirmPassword', 'Confirm Password'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {label}
              </span>

              <input
                type={
                  key.includes('password') || key.includes('Password')
                    ? 'password'
                    : key === 'email'
                      ? 'email'
                      : 'text'
                }
                value={String(form[key as keyof FormState] || '')}
                onChange={(e) =>
                  set(key as keyof FormState, e.target.value as never)
                }
                className={inputCls(errors[key])}
              />

              {errors[key] && (
                <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
              )}
            </label>
          ))}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Date of Birth
            </span>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
              className={inputCls(errors.dob)}
            />
            {errors.dob && (
              <p className="mt-1 text-xs text-red-500">{errors.dob}</p>
            )}
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </span>
            <textarea
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              className={`${inputCls(errors.address)} resize-none`}
            />
            {errors.address && (
              <p className="mt-1 text-xs text-red-500">{errors.address}</p>
            )}
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Permanent Address
            </span>
            <textarea
              value={form.permanentAddress}
              onChange={(e) => set('permanentAddress', e.target.value)}
              rows={2}
              className={`${inputCls(errors.permanentAddress)} resize-none`}
            />
            {errors.permanentAddress && (
              <p className="mt-1 text-xs text-red-500">
                {errors.permanentAddress}
              </p>
            )}
          </label>

          <Select
            label="Administrative District"
            value={form.administrativeDistrict || ''}
            options={DISTRICTS}
            error={errors.administrativeDistrict}
            onChange={(value) => set('administrativeDistrict', value)}
            inputCls={inputCls}
          />

          <Field
            label="Fixed Telephone Number"
            value={form.fixedTelephone || ''}
            onChange={(value) => set('fixedTelephone', value)}
            inputCls={inputCls}
          />

          <Field
            label="Residing Since"
            type="date"
            value={form.residingSince || ''}
            onChange={(value) => set('residingSince', value)}
            inputCls={inputCls}
          />

          <Select
            label="Race"
            value={form.race || ''}
            options={RACES}
            onChange={(value) => set('race', value)}
            inputCls={inputCls}
          />

          <Select
            label="Religion"
            value={form.religion || ''}
            options={RELIGIONS}
            onChange={(value) => set('religion', value)}
            inputCls={inputCls}
          />

          <Field
            label="Postal Code"
            value={form.postalCode || ''}
            onChange={(value) => set('postalCode', value)}
            inputCls={inputCls}
          />

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Contact Address
            </span>
            <textarea
              value={form.contactAddress}
              onChange={(e) => set('contactAddress', e.target.value)}
              rows={2}
              className={`${inputCls()} resize-none`}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Father Full Name"
            value={form.fatherName || ''}
            onChange={(value) => set('fatherName', value)}
            inputCls={inputCls}
          />

          <Field
            label="Mother Full Name"
            value={form.motherName || ''}
            onChange={(value) => set('motherName', value)}
            inputCls={inputCls}
          />

          <Field
            label="Guardian Full Name"
            value={form.guardianName || ''}
            onChange={(value) => set('guardianName', value)}
            inputCls={inputCls}
          />

          <Select
            label="Contact Person"
            value={form.contactPerson || 'Mother'}
            options={['Father', 'Mother', 'Guardian']}
            onChange={(value) => set('contactPerson', value)}
            inputCls={inputCls}
          />

          <Field
            label="Fixed Telephone"
            value={form.guardianFixedTel || ''}
            onChange={(value) => set('guardianFixedTel', value)}
            inputCls={inputCls}
          />

          <Field
            label="Mobile"
            value={form.guardianMobile || ''}
            onChange={(value) => set('guardianMobile', value)}
            inputCls={inputCls}
          />

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Guardian Address
            </span>
            <textarea
              value={form.guardianAddress}
              onChange={(e) => set('guardianAddress', e.target.value)}
              rows={2}
              className={`${inputCls()} resize-none`}
            />
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="O/L Category"
              value={form.olCategory || 'Local O/L'}
              options={['Local O/L', 'London O/L']}
              onChange={(value) => set('olCategory', value)}
              inputCls={inputCls}
            />

            <Field
              label="Year"
              value={form.olYear || ''}
              onChange={(value) => set('olYear', value)}
              inputCls={inputCls}
            />

            <Field
              label="Index Number"
              value={form.olIndexNumber || ''}
              onChange={(value) => set('olIndexNumber', value)}
              inputCls={inputCls}
            />

            <Field
              label="Examination Name"
              value={form.olNameUsed || ''}
              onChange={(value) => set('olNameUsed', value)}
              inputCls={inputCls}
            />

            <Select
              label="Result Status"
              value={form.olAccept || 'Accept'}
              options={['Accept', 'Change']}
              onChange={(value) => set('olAccept', value)}
              inputCls={inputCls}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {[
                    'Year',
                    'Index No',
                    'English',
                    'Maths',
                    'Science',
                    'Sinhala',
                    'Tamil',
                    '',
                  ].map((h) => (
                    <th key={h} className="px-2 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(form.olResults || []).map((row, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="p-2">
                      <input
                        value={row.year}
                        onChange={(e) =>
                          updateOlRow(index, 'year', e.target.value)
                        }
                        className="w-20 rounded border border-gray-200 px-2 py-1"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.indexNumber}
                        onChange={(e) =>
                          updateOlRow(index, 'indexNumber', e.target.value)
                        }
                        className="w-24 rounded border border-gray-200 px-2 py-1"
                      />
                    </td>

                    {(
                      [
                        'english',
                        'mathematics',
                        'science',
                        'sinhala',
                        'tamil',
                      ] as const
                    ).map((subject) => (
                      <td key={subject} className="p-2">
                        <select
                          value={row[subject]}
                          onChange={(e) =>
                            updateOlRow(index, subject, e.target.value)
                          }
                          className="w-20 rounded border border-gray-200 px-2 py-1"
                        >
                          <option value="">-</option>
                          {GRADES.map((grade) => (
                            <option key={grade}>{grade}</option>
                          ))}
                        </select>
                      </td>
                    ))}

                    <td className="p-2">
                      {(form.olResults || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              'olResults',
                              (form.olResults || []).filter(
                                (_, i) => i !== index,
                              ),
                            )
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              set('olResults', [...(form.olResults || []), { ...emptyOL }])
            }
            className="flex items-center gap-2 text-sm font-medium text-indigo-600"
          >
            <Plus className="h-4 w-4" /> Add Row
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch
            </label>

            <input
              type="text"
              value={form.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
              placeholder="Enter batch (e.g. May 2026 Batch)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Main Subjects <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-400">
                (select exactly 2) — {(form.mainSubjects || []).length}/2 selected
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {MAIN_SUBJECTS.map((subject) => {
                const checked = (form.mainSubjects || []).includes(subject);

                return (
                  <label
                    key={subject}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMainSubject(subject)}
                    />
                    <span>{subject}</span>
                  </label>
                );
              })}
            </div>

            {errors.mainSubjects && (
              <p className="mt-1 text-xs text-red-500">
                {errors.mainSubjects}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Basket Subjects <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-400">
                (select only 1)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {BASKET_SUBJECTS.map((subject) => {
                const checked = form.basketSubject === subject;

                return (
                  <label
                    key={subject}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => selectBasketSubject(subject)}
                    />
                    <span>{subject}</span>
                  </label>
                );
              })}
            </div>

            {errors.basketSubject && (
              <p className="mt-1 text-xs text-red-500">
                {errors.basketSubject}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-indigo-50 p-4 text-sm text-gray-700">
            <div className="font-semibold text-indigo-900">
              Application Summary
            </div>

            <div className="mt-2 grid gap-1">
              <span>Name: {form.fullNameEnglish || '-'}</span>
              <span>NIC: {form.nicNo || '-'}</span>
              <span>Email: {form.email || '-'}</span>
              <span>District: {form.administrativeDistrict || '-'}</span>
              <span>Batch: {form.batch || '-'}</span>
              <span>
                Subjects:{' '}
                {[...(form.mainSubjects || []), form.basketSubject].filter(Boolean)
                  .length > 0
                  ? [...(form.mainSubjects || []), form.basketSubject]
                      .filter(Boolean)
                      .join(', ')
                  : '-'}
              </span>
            </div>
          </div>

          <label className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.declarationRules}
              onChange={(e) => set('declarationRules', e.target.checked)}
            />
            <span>I agree to follow all institute rules and regulations.</span>
          </label>

          <label className="flex gap-3 rounded-lg border border-gray-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.declarationAccuracy}
              onChange={(e) => set('declarationAccuracy', e.target.checked)}
            />
            <span>
              I declare that all provided information is true and accurate.
            </span>
          </label>

          {errors.declaration && (
            <p className="text-xs text-red-500">{errors.declaration}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          {step === 1 ? (
            'Cancel'
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" /> Previous
            </>
          )}
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => validateStep() && setStep((s) => s + 1)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Final Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputCls,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputCls: () => string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls()}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  inputCls,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  inputCls: (err?: string) => string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls(error)}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </label>
  );
}