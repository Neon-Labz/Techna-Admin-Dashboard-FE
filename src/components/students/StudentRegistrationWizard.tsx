'use client';

import { useMemo, useState } from 'react';
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
import type { Module, Student, OLResult } from '../../types';
import {
  AL_SUBJECT_OPTIONS,
  OL_GRADE_OPTIONS,
  cleanOlResults,
  normalizeAlSubjects,
} from '../../utils/studentPayload';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const RACES = [
  'Sinhala',
  'Sri Lankan Tamil',
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
  'Christianity',
  'Catholicism',
  'Other',
];

const STEPS = [
  { id: 1, label: 'Basic Info', icon: User },
  { id: 2, label: 'Address & Contact', icon: MapPin },
  { id: 3, label: 'Parent Details', icon: User },
  { id: 4, label: 'O/L Results', icon: BookOpen },
  { id: 5, label: 'Subjects & Confirmation', icon: FileText },
];

const WIZARD_LABEL_CLASS = 'mb-1 block text-xs font-semibold text-gray-700';

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
  citizenByDescent: 'YES',
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
  modules: Module[];
  onCancel: () => void;
  onSubmit: (payload: WizardPayload) => Promise<void>;
}

export default function StudentRegistrationWizard({
  modules,
  onCancel,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const subjectOptions = useMemo(() => {
    return Array.from(new Set([...AL_SUBJECT_OPTIONS]));
  }, [modules]);

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
    `block h-10 w-full min-w-0 max-w-full rounded-md border px-3 text-[16px] leading-5 md:h-9 md:text-sm ${
      err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
    } outline-none transition-colors focus:border-indigo-500 focus:ring-0`;
  const labelCls = WIZARD_LABEL_CLASS;

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.fullNameEnglish?.trim()) {
        nextErrors.fullNameEnglish = 'Full name English is required';
      }
      if (!form.dob) nextErrors.dob = 'Date of birth is required';
      if (!form.nicNo?.trim()) nextErrors.nicNo = 'NIC number is required';
      if (!form.whatsappNo?.trim()) {
        nextErrors.whatsappNo = 'WhatsApp number is required';
      }
      if (!form.email.trim()) nextErrors.email = 'Email is required';
      if (!form.password) nextErrors.password = 'Password is required';
      if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match';
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
      if ((form.subjects || []).length === 0) {
        nextErrors.subjects = 'Select at least one subject';
      }
      if (!form.declarationRules || !form.declarationAccuracy) {
        nextErrors.declaration = 'Both declarations are required';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateOlRow = (index: number, key: keyof OLResult, value: string) => {
    setForm((prev) => ({
      ...prev,
      olResults: (prev.olResults || []).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    }));
  };

  const toggleSubject = (subject: string) => {
    setForm((prev) => {
      const current = prev.subjects || [];
      const updated = current.includes(subject)
        ? current.filter((s) => s !== subject)
        : [...current, subject];

      return {
        ...prev,
        subjects: updated,
        modules: updated,
      };
    });
  };

  const submit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);

    const fullNameEnglish = form.fullNameEnglish?.trim() || form.name.trim();
    const selectedSubjects = normalizeAlSubjects(form.subjects || []);

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
        olResults: cleanOlResults(form.olResults || []) as OLResult[],
        modules: selectedSubjects,
        subjects: selectedSubjects,
        enrolledAt: new Date().toISOString(),
      } as WizardPayload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="flex max-w-full items-center gap-2 overflow-x-auto border-b border-gray-100 pb-3">
        {STEPS.map((item) => {
          const Icon = item.icon;
          const active = step === item.id;
          const done = step > item.id;

          return (
            <div key={item.id} className="flex min-w-max items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <span className={labelCls}>
                {label}
              </span>

              <input
                autoComplete="off"
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
            <span className={labelCls}>
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
            <span className={labelCls}>
              Address
            </span>
            <textarea
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              className={`${inputCls()} h-16 resize-none py-2`}
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className={labelCls}>
              Permanent Address
            </span>
            <textarea
              value={form.permanentAddress}
              onChange={(e) => set('permanentAddress', e.target.value)}
              rows={2}
              className={`${inputCls(errors.permanentAddress)} h-16 resize-none py-2`}
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

          <Select
            label="Citizen by Descent"
            value={form.citizenByDescent || 'YES'}
            options={['YES', 'NO']}
            onChange={(value) => set('citizenByDescent', value)}
            inputCls={inputCls}
          />

          <Field
            label="Postal Code"
            value={form.postalCode || ''}
            onChange={(value) => set('postalCode', value)}
            inputCls={inputCls}
          />

          <label className="block md:col-span-2">
            <span className={labelCls}>
              Contact Address
            </span>
            <textarea
              value={form.contactAddress}
              onChange={(e) => set('contactAddress', e.target.value)}
              rows={2}
              className={`${inputCls()} h-16 resize-none py-2`}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <span className={labelCls}>
              Guardian Address
            </span>
            <textarea
              value={form.guardianAddress}
              onChange={(e) => set('guardianAddress', e.target.value)}
              rows={2}
              className={`${inputCls()} h-16 resize-none py-2`}
            />
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                        className="h-10 w-20 min-w-0 rounded border border-gray-200 px-2 text-[16px] outline-none focus:border-indigo-500"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={row.indexNumber}
                        onChange={(e) =>
                          updateOlRow(index, 'indexNumber', e.target.value)
                        }
                        className="h-10 w-24 min-w-0 rounded border border-gray-200 px-2 text-[16px] outline-none focus:border-indigo-500"
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
                          className="h-10 w-20 min-w-0 rounded border border-gray-200 px-2 text-[16px] outline-none focus:border-indigo-500"
                        >
                          <option value="">-</option>
                          {OL_GRADE_OPTIONS.map((grade) => (
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
        <div className="space-y-4">
          <div>
            <label className={labelCls}>
              Batch
            </label>

            <input
              type="text"
              value={form.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
              placeholder="Enter batch (e.g. May 2026 Batch)"
              className="block h-10 w-full min-w-0 max-w-full rounded-md border border-gray-200 px-3 text-[16px] outline-none focus:border-indigo-500 md:h-9 md:text-sm"
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-gray-700">
              Subject Selection
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {subjectOptions.map((subject) => {
                const checked = (form.subjects || []).includes(subject);

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
                      onChange={() => toggleSubject(subject)}
                    />
                    <span>{subject}</span>
                  </label>
                );
              })}
            </div>

            {errors.subjects && (
              <p className="mt-1 text-xs text-red-500">{errors.subjects}</p>
            )}
          </div>

          <div className="rounded-lg bg-indigo-50 p-3 text-sm text-gray-700">
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
                {(form.subjects || []).length > 0
                  ? form.subjects.join(', ')
                  : '-'}
              </span>
            </div>
          </div>

          <label className="flex gap-3 rounded-lg border border-gray-200 p-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.declarationRules}
              onChange={(e) => set('declarationRules', e.target.checked)}
            />
            <span>I agree to follow all institute rules and regulations.</span>
          </label>

          <label className="flex gap-3 rounded-lg border border-gray-200 p-2.5 text-sm">
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

      <div className="sticky bottom-0 z-10 -mx-3.5 flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3.5 py-2.5 md:-mx-4 md:px-4">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
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
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
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
      <span className={WIZARD_LABEL_CLASS}>
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
      <span className={WIZARD_LABEL_CLASS}>
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
