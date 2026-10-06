import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parsePhoneNumberFromString, AsYouType, CountryCode } from 'libphonenumber-js';
import { useAuth } from '../../context/AuthContext';
import { AmongLogo } from '../common/AmongLogo';
import { Button } from '../ui/Button';
import { CountryCodePicker } from '../auth/CountryCodePicker';
import { VerificationCodeInput } from '../auth/VerificationCodeInput';
import { DEFAULT_COUNTRY, CountryInfo } from '../../utils/countries';
import {
  IconChevronRight,
  IconChevronLeft,
  IconSparkles,
  IconAlert,
  IconSecurity,
  IconPhone,
  IconRotateCcw,
  IconEdit,
} from '../common/Icons';

interface AuthScreenProps {
  onSuccess: () => void;
  onBackToSplash?: () => void;
}

export function AuthScreen({ onSuccess, onBackToSplash }: AuthScreenProps) {
  const { sendPhoneCode, verifyPhoneCode, clearError } = useAuth();

  // Screen steps: 'phone' -> 'code'
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  // Country and Phone number state
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(DEFAULT_COUNTRY);
  const [phoneInput, setPhoneInput] = useState('');
  const [e164PhoneNumber, setE164PhoneNumber] = useState('');

  // 6-digit verification code
  const [verificationCode, setVerificationCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  // Loading states
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Errors & invalid states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [hasInvalidCodeError, setHasInvalidCodeError] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Retry cooldown timer (in seconds)
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [cooldown]);

  // Handle phone input changes with auto-formatting
  const handlePhoneChange = (rawValue: string) => {
    setErrorMessage(null);
    setErrorCode(null);
    clearError();

    // Strip non-digits (keep digits only for formatting)
    const digitsOnly = rawValue.replace(/[^\d+]/g, '');

    // Format using AsYouType
    const formatter = new AsYouType(selectedCountry.code as CountryCode);
    const formatted = formatter.input(digitsOnly);
    setPhoneInput(formatted);

    // Validate and parse E.164
    const parsed = parsePhoneNumberFromString(digitsOnly, selectedCountry.code as CountryCode);
    if (parsed && parsed.isValid()) {
      setE164PhoneNumber(parsed.number);
    } else {
      // Fallback combined string
      const dialClean = selectedCountry.dialCode;
      const numberClean = digitsOnly.startsWith('+') ? digitsOnly : `${dialClean}${digitsOnly.replace(/^0+/, '')}`;
      setE164PhoneNumber(numberClean);
    }
  };

  // Step 1: Send SMS Verification Code
  const handleSendCode = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (isSendingCode) return;

    setErrorMessage(null);
    setErrorCode(null);
    setHasInvalidCodeError(false);
    clearError();

    // Validate phone number
    const parsed = parsePhoneNumberFromString(phoneInput, selectedCountry.code as CountryCode);
    if (!parsed || !parsed.isValid()) {
      setErrorMessage('Please enter a valid international phone number for the selected country.');
      return;
    }

    const targetE164 = parsed.number;
    setE164PhoneNumber(targetE164);
    setIsSendingCode(true);

    try {
      const result = await sendPhoneCode(targetE164);
      // Transition to code verification step
      setStep('code');
      setVerificationCode('');
      if (result?.devCode) {
        setSimulatedCode(result.devCode);
      } else {
        setSimulatedCode(null);
      }
      setCooldown(30); // 30-second resend cooldown
      setRemainingAttempts(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification SMS.');
      if (err.code) setErrorCode(err.code);
    } finally {
      setIsSendingCode(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || verificationCode).trim();
    if (code.length !== 6 || isVerifyingCode) return;

    setErrorMessage(null);
    setErrorCode(null);
    setHasInvalidCodeError(false);
    setIsVerifyingCode(true);
    clearError();

    try {
      await verifyPhoneCode(e164PhoneNumber, code);
      // Success! Account created or logged in
      onSuccess();
    } catch (err: any) {
      setHasInvalidCodeError(true);
      setErrorMessage(err.message || 'The verification code entered is invalid or expired.');
      if (err.code) setErrorCode(err.code);
      if (typeof err.remainingAttempts === 'number') {
        setRemainingAttempts(err.remainingAttempts);
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Resend code action
  const handleResendCode = async () => {
    if (cooldown > 0 || isSendingCode) return;
    setErrorMessage(null);
    setErrorCode(null);
    setHasInvalidCodeError(false);
    setVerificationCode('');
    setIsSendingCode(true);

    try {
      const result = await sendPhoneCode(e164PhoneNumber);
      if (result?.devCode) {
        setSimulatedCode(result.devCode);
      }
      setCooldown(30);
      setRemainingAttempts(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification SMS.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Back to phone number edit
  const handleEditPhoneNumber = () => {
    setStep('phone');
    setVerificationCode('');
    setSimulatedCode(null);
    setErrorMessage(null);
    setErrorCode(null);
    setHasInvalidCodeError(false);
    setRemainingAttempts(null);
  };

  return (
    <div
      id="auth-screen-container"
      className="relative min-h-screen w-full flex flex-col justify-between px-6 py-8 sm:py-10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans"
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10 mb-4">
        {step === 'code' ? (
          <button
            type="button"
            id="auth-back-to-phone-btn"
            onClick={handleEditPhoneNumber}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
            Change Number
          </button>
        ) : onBackToSplash ? (
          <button
            type="button"
            id="auth-back-to-splash-btn"
            onClick={onBackToSplash}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : (
          <div className="w-8" />
        )}

        <div className="flex items-center gap-2">
          <AmongLogo variant="compact" showWordmark={true} />
        </div>

        <div className="w-8" />
      </div>

      {/* Center Form Container */}
      <div className="w-full max-w-sm mx-auto my-auto z-10 py-2">
        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="step-phone"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Brand Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-zinc-900 dark:text-zinc-100 shadow-xs">
                  <IconPhone className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Enter your phone number
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[280px] leading-relaxed">
                  AMONG uses quiet phone verification. No passwords, usernames, or marketing spam.
                </p>
              </div>

              {/* Error Banner */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    id="phone-error-banner"
                    className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed shadow-xs"
                  >
                    <IconAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div className="flex-1">
                      <p className="font-semibold text-rose-950 dark:text-rose-100">Verification Notice</p>
                      <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorMessage}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phone Input Form */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="phone-number-input"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Country Code Picker */}
                    <CountryCodePicker
                      selectedCountry={selectedCountry}
                      onSelect={(country) => {
                        setSelectedCountry(country);
                        // Re-validate with new country code
                        handlePhoneChange(phoneInput);
                      }}
                      disabled={isSendingCode}
                    />

                    {/* National Phone Input */}
                    <div className="relative flex-1">
                      <input
                        type="tel"
                        id="phone-number-input"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder={selectedCountry.formatPlaceholder}
                        value={phoneInput}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        disabled={isSendingCode}
                        autoFocus
                        className="w-full h-12 px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 text-sm font-mono placeholder:font-sans placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100 transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                    Select your country code and enter your mobile number.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    id="send-code-submit-btn"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isSendingCode || !phoneInput.trim()}
                    icon={
                      isSendingCode ? (
                        <IconSparkles className="w-4 h-4 animate-spin text-zinc-400" />
                      ) : (
                        <IconChevronRight className="w-4 h-4" />
                      )
                    }
                  >
                    {isSendingCode ? 'Sending SMS Code...' : 'Send Verification Code'}
                  </Button>
                </div>
              </form>

              {/* reCAPTCHA container for Firebase Phone Authentication */}
              <div id="recaptcha-container"></div>

              {/* Security Footnote */}
              <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
                <IconSecurity className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <span>Encrypted end-to-end · Firebase Phone Auth</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-code"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Brand Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-3 text-zinc-900 dark:text-zinc-100 shadow-xs">
                  <IconSecurity className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Enter verification code
                </h2>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                    {e164PhoneNumber}
                  </span>
                  <button
                    type="button"
                    id="edit-phone-inline-btn"
                    onClick={handleEditPhoneNumber}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
                  >
                    <IconEdit className="w-3 h-3" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Firebase / Sandbox Verification Code Notice */}
              {simulatedCode && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  id="sms-simulator-banner"
                  className="mb-5 p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold">
                      <IconSparkles className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Firebase Auth Verification</span>
                    </div>
                    <button
                      type="button"
                      id="autofill-simulated-code-btn"
                      onClick={() => {
                        setVerificationCode(simulatedCode);
                        handleVerifyCode(simulatedCode);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 text-[11px] font-medium font-mono hover:opacity-90 cursor-pointer shadow-2xs"
                    >
                      Use code {simulatedCode}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Verification code for <span className="font-mono text-zinc-700 dark:text-zinc-300">{e164PhoneNumber}</span>: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{simulatedCode}</strong>
                  </p>
                </motion.div>
              )}

              {/* Error Banner */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    id="code-error-banner"
                    className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed shadow-xs"
                  >
                    <IconAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div className="flex-1">
                      <p className="font-semibold text-rose-950 dark:text-rose-100">Verification Error</p>
                      <p className="mt-0.5 text-rose-800 dark:text-rose-300">{errorMessage}</p>
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                          {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 6-Digit Code Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyCode();
                }}
                className="space-y-5"
              >
                <div>
                  <VerificationCodeInput
                    value={verificationCode}
                    onChange={(val) => {
                      setVerificationCode(val);
                      if (hasInvalidCodeError) {
                        setHasInvalidCodeError(false);
                        setErrorMessage(null);
                      }
                    }}
                    onComplete={(completedCode) => {
                      handleVerifyCode(completedCode);
                    }}
                    disabled={isVerifyingCode}
                    hasError={hasInvalidCodeError}
                    autoFocus={true}
                  />
                  <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                    Enter the 6-digit code sent to your mobile device
                  </p>
                </div>

                {/* Verify Button */}
                <div>
                  <Button
                    type="submit"
                    id="verify-code-submit-btn"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isVerifyingCode || verificationCode.length !== 6}
                    icon={
                      isVerifyingCode ? (
                        <IconSparkles className="w-4 h-4 animate-spin text-zinc-400" />
                      ) : (
                        <IconChevronRight className="w-4 h-4" />
                      )
                    }
                  >
                    {isVerifyingCode ? 'Verifying Code...' : 'Verify & Continue'}
                  </Button>
                </div>
              </form>

              {/* Resend Code / Retry State */}
              <div className="mt-6 text-center">
                {cooldown > 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Resend code in{' '}
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {cooldown}s
                    </span>
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Didn't receive the SMS?</span>
                    <button
                      type="button"
                      id="resend-sms-code-btn"
                      onClick={handleResendCode}
                      disabled={isSendingCode}
                      className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <IconRotateCcw className="w-3 h-3" />
                      {isSendingCode ? 'Sending...' : 'Resend Code'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Quiet Sanctuary Reassurance */}
      <div className="w-full max-w-sm mx-auto text-center z-10 pt-2">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          AMONG Sanctuary · Private, unhurried, verified.
        </p>
      </div>
    </div>
  );
}
