import { CountryCode } from 'libphonenumber-js';

export interface CountryInfo {
  name: string;
  code: CountryCode;
  dialCode: string;
  flag: string;
  formatPlaceholder: string;
}

export const COUNTRIES: CountryInfo[] = [
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', formatPlaceholder: '(555) 000-0000' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', formatPlaceholder: '7911 123456' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', formatPlaceholder: '(555) 000-0000' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺', formatPlaceholder: '412 345 678' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', formatPlaceholder: '151 23456789' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', formatPlaceholder: '6 12 34 56 78' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵', formatPlaceholder: '90-1234-5678' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳', formatPlaceholder: '98765 43210' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪', formatPlaceholder: '85 123 4567' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱', formatPlaceholder: '6 12345678' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪', formatPlaceholder: '70 123 45 67' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴', formatPlaceholder: '412 34 567' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰', formatPlaceholder: '20 12 34 56' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮', formatPlaceholder: '40 1234567' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭', formatPlaceholder: '78 123 45 67' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹', formatPlaceholder: '664 1234567' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪', formatPlaceholder: '470 12 34 56' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹', formatPlaceholder: '320 123 4567' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', formatPlaceholder: '612 34 56 78' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹', formatPlaceholder: '912 345 678' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿', formatPlaceholder: '21 123 4567' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬', formatPlaceholder: '8123 4567' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷', formatPlaceholder: '10-1234-5678' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷', formatPlaceholder: '(11) 98765-4321' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽', formatPlaceholder: '55 1234 5678' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷', formatPlaceholder: '9 11 1234-5678' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦', formatPlaceholder: '71 123 4567' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', formatPlaceholder: '50 123 4567' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', formatPlaceholder: '50 123 4567' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱', formatPlaceholder: '50-123-4567' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱', formatPlaceholder: '512 345 678' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿', formatPlaceholder: '601 123 456' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷', formatPlaceholder: '691 234 5678' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷', formatPlaceholder: '501 234 56 78' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰', formatPlaceholder: '5123 4567' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼', formatPlaceholder: '912 345 678' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱', formatPlaceholder: '9 1234 5678' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴', formatPlaceholder: '300 123 4567' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩', formatPlaceholder: '812-3456-7890' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭', formatPlaceholder: '917 123 4567' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾', formatPlaceholder: '12-345 6789' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭', formatPlaceholder: '81 234 5678' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳', formatPlaceholder: '91 234 56 78' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬', formatPlaceholder: '802 123 4567' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪', formatPlaceholder: '712 345678' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬', formatPlaceholder: '100 123 4567' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // United States
