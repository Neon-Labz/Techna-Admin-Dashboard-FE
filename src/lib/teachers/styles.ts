// Shared inline styles / class names for the teacher form fields.
import type React from 'react';

export const LABEL: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: '14px',
  lineHeight: '20px',
  color: '#374151',
  marginBottom: '8px',
};

export const INPUT_BASE =
  'w-full border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base text-[#374151] placeholder:text-[#6B7280] bg-white';

export const INPUT_STYLE: React.CSSProperties = { height: '46px', paddingLeft: '13px', paddingRight: '13px' };
