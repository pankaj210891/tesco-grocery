"use client";

import { useEffect, useRef, useState } from "react";
import { X, Phone, CheckCircle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { OTP_COOLDOWN_SEC } from "@/lib/otp/generate";

interface PhoneVerificationModalProps {
  phone:    string;
  onClose:  () => void;
  onVerified: () => void;
}

type Step = "send" | "verify" | "success";

export default function PhoneVerificationModal({
  phone,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const { token } = useAuthStore();

  const [step,      setStep]      = useState<Step>("send");
  const [digits,    setDigits]    = useState<string[]>(Array(6).fill(""));
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [cooldown,  setCooldown]  = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startCooldown(sec: number) {
    setCooldown(sec);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      const client = authClient(token);
      const { data } = await client.post<{ message: string; cooldown: number }>(
        "/api/account/phone/send-otp",
      );
      toast.success(data.message ?? "Verification code sent.");
      startCooldown(data.cooldown ?? OTP_COOLDOWN_SEC);
      setStep("verify");
      // Auto-focus first input after transition
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !token) return;
    setDigits(Array(6).fill(""));
    setError(null);
    setSending(true);
    try {
      const client = authClient(token);
      const { data } = await client.post<{ message: string; cooldown: number }>(
        "/api/account/phone/send-otp",
      );
      toast.success("New code sent.");
      startCooldown(data.cooldown ?? OTP_COOLDOWN_SEC);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    const otp = digits.join("");
    if (otp.length < 6 || !token) return;
    setVerifying(true);
    setError(null);
    try {
      const client = authClient(token);
      await client.post("/api/account/phone/verify-otp", { otp });
      setStep("success");
      setTimeout(() => {
        onVerified();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      // Shake the inputs on error
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } finally {
      setVerifying(false);
    }
  }

  function handleDigitInput(index: number, value: string) {
    // Allow pasting full OTP
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, "").slice(0, 6);
      if (cleaned.length === 6) {
        const next = cleaned.split("");
        setDigits(next);
        inputRefs.current[5]?.focus();
        return;
      }
    }
    const char = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    if (char && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") void handleVerify();
  }

  const maskedPhone = phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
  const otpComplete = digits.every((d) => d !== "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Phone verification"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C75]/10 dark:bg-blue-900/30 flex items-center justify-center">
              {step === "success"
                ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden />
                : <Phone className="h-5 w-5 text-[#0F4C75] dark:text-blue-400" aria-hidden />
              }
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Verify phone number</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{maskedPhone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* ── Step: send ── */}
          {step === "send" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-[#0F4C75] dark:text-blue-400 mt-0.5 shrink-0" aria-hidden />
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  We&rsquo;ll send a 6-digit code to your registered email. Enter it on the next screen to verify your number.
                </p>
              </div>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                onClick={() => void handleSendOtp()}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0F4C75] hover:bg-[#0d3f63] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…</>
                  : "Send verification code"
                }
              </button>
            </div>
          )}

          {/* ── Step: verify ── */}
          {step === "verify" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Enter the 6-digit code sent to your email.
              </p>

              {/* OTP digit inputs */}
              <div className="flex justify-center gap-2" role="group" aria-label="6-digit verification code">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitInput(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Digit ${i + 1}`}
                    className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none transition-colors
                      ${error
                        ? "border-red-400 dark:border-red-500"
                        : digit
                          ? "border-[#0F4C75] dark:border-blue-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-[#0F4C75] dark:focus:border-blue-500"
                      }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center" role="alert">
                  {error}
                </p>
              )}

              {/* Resend */}
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span>Didn&rsquo;t receive it?</span>
                {cooldown > 0 ? (
                  <span className="font-semibold text-gray-400 dark:text-gray-500">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    onClick={() => void handleResend()}
                    disabled={sending}
                    className="flex items-center gap-1 font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden />
                    Resend code
                  </button>
                )}
              </div>

              <button
                onClick={() => void handleVerify()}
                disabled={!otpComplete || verifying}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0F4C75] hover:bg-[#0d3f63] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {verifying
                  ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verifying…</>
                  : "Verify"
                }
              </button>

              <button
                onClick={() => { setStep("send"); setError(null); setDigits(Array(6).fill("")); }}
                className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                ← Change phone number
              </button>
            </div>
          )}

          {/* ── Step: success ── */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" aria-hidden />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white text-center">
                Phone verified!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Your number {maskedPhone} has been verified successfully.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
