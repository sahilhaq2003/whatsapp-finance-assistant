'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { whatsappService } from '@/services/whatsapp.service';
import type {
  WhatsAppConnection,
  PairingCodeResponse,
  SendTestMessageRequest,
} from '@/types/whatsapp';

type ConnectionState = 'loading' | 'not_configured' | 'connected' | 'configured';
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export default function WhatsAppSettingsPage() {
  const { selectedBusiness, businesses, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [state, setState] = useState<ConnectionState>('loading');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  const [pairingCode, setPairingCode] = useState<PairingCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingPolling, setPairingPolling] = useState(false);

  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Salligo WhatsApp integration is working.',
  );
  const [testLoading, setTestLoading] = useState(false);
  const hasInvalidBusinessContext =
    !authLoading &&
    isAuthenticated &&
    (!selectedBusiness ||
      !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id) ||
      businesses.length === 0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const loadConnection = useCallback(async () => {
    if (
      !selectedBusiness ||
      !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id)
    ) {
      setState('not_configured');
      return;
    }
    setState('loading');
    try {
      const res = await whatsappService.getConnection();
      if (res.success) {
        setConnection(res.data);
        if (res.data.status === 'not_configured') {
          setState('not_configured');
        } else if (res.data.connected) {
          setState('connected');
        } else {
          setState('configured');
        }
      }
    } catch {
      setState('not_configured');
    }
  }, [selectedBusiness]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadConnection();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadConnection]);

  useEffect(() => {
    if (!pairingPolling) return;
    const interval = setInterval(async () => {
      try {
        const res = await whatsappService.getConnection();
        if (res.success && res.data.pairedSender) {
          setPairingPolling(false);
          setPairingCode(null);
          setSuccess('Your WhatsApp is connected successfully.');
          loadConnection();
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);

    const timeout = setTimeout(() => {
      setPairingPolling(false);
    }, 120000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pairingPolling, loadConnection]);

  const handleCreateConnection = async () => {
    if (
      !selectedBusiness ||
      !MONGO_OBJECT_ID_PATTERN.test(selectedBusiness._id)
    ) {
      setError('Create or select a business workspace before configuring WhatsApp');
      return;
    }
    if (!wabaId || !phoneNumberId || !displayPhone || !businessPhone) {
      setError('All fields are required');
      return;
    }
    setConfigLoading(true);
    setError('');
    try {
      const res = await whatsappService.createConnection({
        wabaId,
        phoneNumberId,
        displayPhoneNumber: displayPhone,
        businessPhoneE164: businessPhone,
      });
      if (res.success) {
        setShowConfigForm(false);
        setSuccess('WhatsApp connection configured successfully');
        loadConnection();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await whatsappService.disconnectConnection();
      if (res.success) {
        setSuccess('WhatsApp disconnected');
        setError('');
        setPairingCode(null);
        setPairingPolling(false);
        loadConnection();
      } else {
        setError(res.message || 'Failed to disconnect WhatsApp');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleGeneratePairingCode = async () => {
    setPairingLoading(true);
    setError('');
    try {
      const res = await whatsappService.generatePairingCode();
      if (res.success) {
        setPairingCode(res.data);
        setPairingPolling(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testRecipient) {
      setError('Recipient phone number is required');
      return;
    }
    setTestLoading(true);
    setError('');
    try {
      const data: SendTestMessageRequest = {
        recipientPhone: testRecipient,
        message: testMessage,
      };
      const res = await whatsappService.sendTestMessage(data);
      if (res.success) {
        setSuccess('Test message sent successfully');
        setTestRecipient('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test message');
    } finally {
      setTestLoading(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading WhatsApp settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#17211c]">WhatsApp Integration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect your business WhatsApp number to Salligo.
        </p>
      </div>

      {(error || hasInvalidBusinessContext) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error ||
            'Select a valid business workspace before configuring WhatsApp.'}
          {error && (
            <button onClick={() => setError('')} className="ml-2 text-red-500 hover:underline">
              Dismiss
            </button>
          )}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-green-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
          <button onClick={() => setSuccess('')} className="ml-2 text-green-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-semibold text-[#17211c]">Connection Status</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Status:</span>
            {state === 'connected' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Not Connected
              </span>
            )}
          </div>
          {connection?.displayPhoneNumber && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Business WhatsApp:</span>
              <span className="text-sm font-medium text-[#17211c]">
                {connection.displayPhoneNumber}
              </span>
            </div>
          )}
          {connection?.pairedSender !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Authorized WhatsApp User:</span>
              <span className={`text-sm font-medium ${connection.pairedSender ? 'text-emerald-700' : 'text-slate-500'}`}>
                {connection.pairedSender ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          )}
        </div>

        {state === 'not_configured' && !showConfigForm && (
          <div className="mt-6">
            <button
              onClick={() => setShowConfigForm(true)}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Configure WhatsApp
            </button>
          </div>
        )}

        {showConfigForm && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-[#17211c]">Configure WhatsApp Business</h3>
            <div>
              <label className="block text-sm text-slate-600">WhatsApp Business Account ID</label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Enter WABA ID"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Enter Phone Number ID"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Display Phone Number</label>
              <input
                type="text"
                value={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="+94 XX XXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Business Phone (E.164)</label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                placeholder="+94771234567"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateConnection}
                disabled={configLoading}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {configLoading ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={() => setShowConfigForm(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-[#f4f6f3]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'connected' && (
          <div className="mt-6 flex flex-wrap gap-2">
            {!pairingCode && (
              <button
                onClick={handleGeneratePairingCode}
                disabled={pairingLoading}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pairingLoading ? 'Generating...' : 'Connect My WhatsApp'}
              </button>
            )}
            <button
              onClick={() => {
                const el = document.getElementById('test-message-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-[#f4f6f3]"
            >
              Test Message
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-2xl border border-red-300 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
            >
              Disconnect
            </button>
          </div>
        )}

        {pairingCode && (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">Pairing Code</h3>
            <p className="mt-2 text-2xl font-bold tracking-wider text-emerald-700">
              {pairingCode.code}
            </p>
            <p className="mt-2 text-sm text-emerald-700">
              Send this code from your personal WhatsApp to:
            </p>
            <p className="text-sm font-medium text-emerald-800">
              {pairingCode.displayPhoneNumber}
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              This code expires in {Math.floor(pairingCode.expiresInSeconds / 60)} minutes.
              {pairingPolling && ' Waiting for pairing...'}
            </p>
          </div>
        )}
      </div>

      <div id="test-message-section" className="rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-semibold text-[#17211c]">Test Message</h2>
        <p className="mt-1 text-sm text-slate-500">
          Send a test message to verify the WhatsApp integration is working.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm text-slate-600">Recipient Phone Number</label>
            <input
              type="text"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              placeholder="+94771234567"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>
          <button
            onClick={handleSendTestMessage}
            disabled={testLoading || !testRecipient}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {testLoading ? 'Sending...' : 'Send Test Message'}
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-semibold text-[#17211c]">Voice Input</h2>
        <p className="mt-1 text-sm text-slate-500">
          Send voice notes on WhatsApp to record transactions through speech.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-[#f4f6f3] px-4 py-3">
            <span className="text-slate-700">Status</span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Available
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#f4f6f3] px-4 py-3">
            <span className="text-slate-700">Maximum voice duration</span>
            <span className="text-[#17211c]">2 minutes</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#f4f6f3] px-4 py-3">
            <span className="text-slate-700">Maximum file size</span>
            <span className="text-[#17211c]">10 MB</span>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
            Voice notes are processed using speech-to-text and follow the same confirmation flow as text messages.
            No voice recordings are stored permanently.
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-semibold text-[#17211c]">Setup Instructions</h2>
        <p className="mt-2 text-sm text-slate-600">
          Follow the guided setup to connect your WhatsApp in 3 simple steps.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/whatsapp/setup"
            className="inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open Setup Wizard →
          </Link>
        </div>
      </div>
    </div>
  );
}
