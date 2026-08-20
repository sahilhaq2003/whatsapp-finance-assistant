'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { whatsappService } from '@/services/whatsapp.service';

type Step = 1 | 2 | 3;
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export default function WhatsAppSetupPage() {
  const { selectedBusiness, businesses, isLoading: authLoading, isAuthenticated } =
    useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');

  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpires, setPairingExpires] = useState(0);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingPolling, setPairingPolling] = useState(false);
  const [connected, setConnected] = useState(false);
  const hasInvalidBusinessContext =
    !authLoading &&
    isAuthenticated &&
    (!selectedBusiness ||
      !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id) ||
      businesses.length === 0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (step !== 2 || webhookUrl) return;

    whatsappService
      .getWebhookUrl()
      .then((res) => {
        if (res.success) setWebhookUrl(res.data.url);
      })
      .catch(() => {
        setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
      });
  }, [step, webhookUrl]);

  useEffect(() => {
    if (!pairingPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await whatsappService.getConnection();
        if (res.success && res.data.pairedSender) {
          setPairingPolling(false);
          setConnected(true);
        }
      } catch {
        // Polling can safely ignore transient API errors.
      }
    }, 3000);

    const timeout = setTimeout(() => setPairingPolling(false), 120000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pairingPolling]);

  const handleStep1Next = async () => {
    const normalizedPhone = phoneNumber.trim();
    const normalizedDisplayPhone = displayPhone.trim() || normalizedPhone;
    const normalizedWabaId = wabaId.trim();
    const normalizedPhoneNumberId = phoneNumberId.trim();

    if (
      !selectedBusiness ||
      !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id)
    ) {
      setError(
        'Create or select a business workspace before connecting WhatsApp.',
      );
      return;
    }

    if (!normalizedWabaId || !normalizedPhoneNumberId) {
      setError('Enter your WhatsApp Business Account ID and Phone Number ID.');
      return;
    }

    if (!normalizedPhone) {
      setError('Enter your business WhatsApp number.');
      return;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError(
        'Enter the WhatsApp number in E.164 format, for example +94771234567.',
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      localStorage.setItem('dp_selected_business', selectedBusiness._id);
      const res = await whatsappService.createConnection({
        wabaId: normalizedWabaId,
        phoneNumberId: normalizedPhoneNumberId,
        displayPhoneNumber: normalizedDisplayPhone,
        businessPhoneE164: normalizedPhone,
      });

      if (res.success) {
        setStep(2);
      } else {
        setError(res.message || 'Failed to save WhatsApp connection.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save WhatsApp connection.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setPairingLoading(true);
    setError('');

    try {
      const res = await whatsappService.generatePairingCode();
      if (res.success) {
        setPairingCode(res.data.code);
        setPairingExpires(res.data.expiresInSeconds);
        setPairingPolling(true);
      } else {
        setError(res.message || 'Failed to generate pairing code.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate pairing code.',
      );
    } finally {
      setPairingLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#17211c]">Connect WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500">
          Link your WhatsApp Business Cloud API account in 3 steps.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step >= item
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {connected && item < step ? 'OK' : item}
            </div>
            {item < 3 && (
              <div
                className={`h-0.5 w-12 ${
                  step > item ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {(error || hasInvalidBusinessContext) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
          {error ||
            'Select a valid business workspace before configuring WhatsApp.'}
        </div>
      )}

      {step === 1 && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-[#17211c]">
            WhatsApp Business details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use the IDs from Meta Developer Dashboard. These are required for
            webhook routing and outbound messages.
          </p>

          <div className="mt-6 space-y-4">
            <WizardField
              label="WhatsApp Business Account ID"
              value={wabaId}
              onChange={setWabaId}
              placeholder="123456789012345"
              help="In Meta, open WhatsApp > API Setup and copy the WhatsApp Business Account ID."
            />
            <WizardField
              label="Phone Number ID"
              value={phoneNumberId}
              onChange={setPhoneNumberId}
              placeholder="987654321098765"
              help="Use the Meta Phone Number ID, not the visible phone number."
            />
            <WizardField
              label="Business WhatsApp number"
              type="tel"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="+94771234567"
              help="Include the country code in E.164 format."
            />
            <WizardField
              label="Display number"
              value={displayPhone}
              onChange={setDisplayPhone}
              placeholder="+94 77 123 4567"
              help="Optional. This is only used as a friendly label in your dashboard."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleStep1Next}
              disabled={loading || !phoneNumber || !wabaId || !phoneNumberId}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Next'}
            </button>
            <Link
              href="/dashboard/settings/whatsapp"
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-[#17211c]">
            Configure webhook
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Copy this callback URL into your Meta WhatsApp configuration.
          </p>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700">
              Webhook URL
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700"
              />
              <button
                onClick={copyUrl}
                className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f4f6f3] p-4">
            <p className="text-sm font-semibold text-[#17211c]">
              Meta setup checklist
            </p>
            <ol className="mt-2 space-y-2 text-sm text-slate-600">
              <li>1. Open Meta Developer Dashboard.</li>
              <li>2. Select your app, then open WhatsApp Configuration.</li>
              <li>3. Paste the webhook URL above.</li>
              <li>
                4. Set Verify Token to{' '}
                <code className="rounded bg-emerald-100 px-1 text-emerald-700">
                  salligo_verify
                </code>
                .
              </li>
              <li>5. Subscribe to messages and message status events.</li>
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setStep(3)}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              I configured it
            </button>
            <button
              onClick={() => setStep(1)}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-[#17211c]">
            Pair your sender
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate a one-time code and send it from your WhatsApp account to
            the configured business number.
          </p>

          {!pairingCode && !connected && (
            <div className="mt-6">
              <button
                onClick={handleGenerateCode}
                disabled={pairingLoading}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pairingLoading ? 'Generating...' : 'Generate pairing code'}
              </button>
            </div>
          )}

          {pairingCode && !connected && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase text-emerald-600">
                Pairing code
              </p>
              <p className="mt-2 text-4xl font-bold tracking-[0.2em] text-emerald-700">
                {pairingCode}
              </p>
              <p className="mt-3 text-sm text-emerald-700">
                Send this code to {displayPhone || phoneNumber}.
              </p>
              <p className="mt-2 text-xs text-emerald-600">
                Expires in {Math.floor(pairingExpires / 60)} minutes.
                {pairingPolling && ' Waiting for pairing...'}
              </p>
            </div>
          )}

          {connected && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                OK
              </div>
              <p className="mt-3 text-lg font-semibold text-emerald-800">
                WhatsApp connected
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Your business WhatsApp is now linked.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {connected ? (
              <Link
                href="/dashboard"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <Link
                  href="/dashboard/settings/whatsapp"
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Skip for now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WizardField({
  label,
  value,
  onChange,
  placeholder,
  help,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  help: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
      />
      <p className="mt-1 text-xs text-slate-400">{help}</p>
    </div>
  );
}
