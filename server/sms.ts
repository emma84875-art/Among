import crypto from 'node:crypto';
import {
  storePhoneVerification,
  getPhoneVerification,
  recordVerificationAttempt,
  deletePhoneVerification,
} from './db.js';

// Track last request time to enforce retry cooldown
const lastRequestTimestamps = new Map<string, number>();

export interface SendSmsResult {
  success: boolean;
  error?: string;
  code?: string;
  cooldownSeconds?: number;
  isDevMode?: boolean;
  devCode?: string;
}

export interface VerifySmsResult {
  success: boolean;
  error?: string;
  code?: string;
  remainingAttempts?: number;
}

/**
 * Handles phone verification code generation.
 * Operates without third-party Twilio requirements, aligning with Firebase Authentication.
 */
export async function sendVerificationSms(phoneNumber: string): Promise<SendSmsResult> {
  const cleanPhone = phoneNumber.trim();

  // No SMS provider is wired up, so codes can only be surfaced in development. In production
  // this must fail closed instead of handing the code back to the caller.
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      code: 'SMS_NOT_CONFIGURED',
      error: 'SMS verification is not available. Please sign in with Firebase phone authentication.',
    };
  }

  // 1. Check rate limit cooldown (30 seconds between requests for the same number)
  const lastTime = lastRequestTimestamps.get(cleanPhone) || 0;
  const now = Date.now();
  const diffSeconds = Math.floor((now - lastTime) / 1000);
  const COOLDOWN_PERIOD = 30;

  if (diffSeconds < COOLDOWN_PERIOD) {
    const waitTime = COOLDOWN_PERIOD - diffSeconds;
    return {
      success: false,
      code: 'RATE_LIMITED',
      cooldownSeconds: waitTime,
      error: `Please wait ${waitTime} seconds before requesting another verification code.`,
    };
  }

  // 2. Generate secure 6-digit OTP for sandbox / direct verification
  const randomCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = crypto.createHash('sha256').update(randomCode).digest('hex');

  lastRequestTimestamps.set(cleanPhone, now);
  storePhoneVerification(cleanPhone, codeHash);
  console.log(`\n========================================`);
  console.log(`[Among Phone Verification] Code for ${cleanPhone}: ${randomCode}`);
  console.log(`========================================\n`);

  return {
    success: true,
    isDevMode: true,
    devCode: randomCode,
  };
}

/**
 * Verifies a 6-digit verification code for an E.164 phone number.
 */
export async function verifySmsCode(phoneNumber: string, inputCode: string): Promise<VerifySmsResult> {
  const cleanPhone = phoneNumber.trim();
  const cleanCode = inputCode.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      code: 'INVALID_FORMAT',
      error: 'Please enter a valid 6-digit numeric verification code.',
    };
  }

  // Verify using stored code hash
  const record = getPhoneVerification(cleanPhone);
  if (!record || !record.codeHash) {
    return {
      success: false,
      code: 'NO_PENDING_CODE',
      error: 'No active verification code found for this number. Please request a new code.',
    };
  }

  // Check expiration
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    deletePhoneVerification(cleanPhone);
    return {
      success: false,
      code: 'CODE_EXPIRED',
      error: 'This verification code has expired. Please request a new code.',
    };
  }

  // Check attempt limits
  const { allowed, remainingAttempts } = recordVerificationAttempt(cleanPhone);
  if (!allowed) {
    deletePhoneVerification(cleanPhone);
    return {
      success: false,
      code: 'MAX_ATTEMPTS_EXCEEDED',
      remainingAttempts: 0,
      error: 'Too many incorrect attempts. For security, please request a new verification code.',
    };
  }

  // Constant-time hash comparison
  const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
  const isValid = crypto.timingSafeEqual(Buffer.from(inputHash, 'hex'), Buffer.from(record.codeHash, 'hex'));

  if (isValid) {
    deletePhoneVerification(cleanPhone);
    return { success: true };
  } else {
    return {
      success: false,
      code: 'INVALID_CODE',
      remainingAttempts,
      error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
    };
  }
}
