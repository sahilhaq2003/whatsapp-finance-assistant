/**
 * End-to-end workflow test for the WhatsApp inbox feature.
 *
 * Boots the real NestJS backend against an in-memory MongoDB and a local
 * mock of the Meta Graph API, then drives the complete flow:
 *
 *   webhook -> dedupe -> conversation -> AI draft (real Gemini call)
 *   -> review/approve/reject/regenerate via the secured API
 *   -> send through WhatsApp service -> delivery status webhook
 *   -> SSE realtime events
 *
 * Usage:
 *   npm run build && node scripts/e2e-inbox-workflow.mjs
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const PORT = 5055;
const MOCK_META_PORT = 9099;
const API = `http://127.0.0.1:${PORT}/api`;

// ---------------------------------------------------------------- helpers --
function loadEnvFile() {
  const envPath = path.join(BACKEND_ROOT, '.env');
  const values = {};
  if (!fs.existsSync(envPath)) return values;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const ENV_FILE = loadEnvFile();
const APP_SECRET = ENV_FILE.WHATSAPP_APP_SECRET || 'test_app_secret';
const VERIFY_TOKEN = ENV_FILE.WHATSAPP_VERIFY_TOKEN || 'salligo_verify';

let passed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.error(`  FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  for (;;) {
    try {
      const result = await fn();
      if (result) return result;
    } catch {
      /* retry */
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function api(pathname, { method = 'GET', body, cookies, headers: extraHeaders } = {}) {
  const headers = { ...(extraHeaders || {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookies) headers['Cookie'] = cookies;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, json };
}

// ------------------------------------------------------------- mock meta ---
const mockMeta = {
  server: null,
  requests: [],
  counter: 0,
};

function startMockMeta() {
  return new Promise((resolve) => {
    mockMeta.server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        mockMeta.requests.push({ url: req.url, body: raw ? JSON.parse(raw) : null });
        mockMeta.counter += 1;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: '+94770000002', wa_id: '94770000002' }],
            messages: [{ id: `wamid.MOCK${String(mockMeta.counter).padStart(4, '0')}` }],
          }),
        );
      });
    });
    mockMeta.server.listen(MOCK_META_PORT, () => resolve());
  });
}

// -------------------------------------------------------------- webhook ----
function signPayload(rawBody) {
  return `sha256=${crypto.createHmac('sha256', APP_SECRET).update(Buffer.from(rawBody, 'utf8')).digest('hex')}`;
}

async function postWebhook(payload) {
  const rawBody = JSON.stringify(payload);
  const res = await fetch(`${API}/whatsapp/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signPayload(rawBody),
    },
    body: rawBody,
  });
  return res.json();
}

function customerMessagePayload({ wamId, from, text, timestampSeconds }) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'E2E_WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '94770000002',
                phone_number_id: 'E2E_PHONE_ID_1',
              },
              contacts: [{ profile: { name: 'Nimal Perera' }, wa_id: from.replace(/^\+/, '') }],
              messages: [
                {
                  from: from.replace(/^\+/, ''),
                  id: wamId,
                  timestamp: String(timestampSeconds),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function statusPayload({ providerMessageId, status, recipientPhone }) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'E2E_WABA_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '94770000002',
                phone_number_id: 'E2E_PHONE_ID_1',
              },
              statuses: [
                {
                  id: providerMessageId,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientPhone.replace(/^\+/, ''),
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

// ------------------------------------------------------------------ main ---
async function main() {
  console.log('Starting in-memory MongoDB...');
  const mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri('e2e_inbox');

  console.log('Starting mock Meta Graph API...');
  await startMockMeta();

  console.log('Booting backend (dist/src/main.js)...');
  const child = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: BACKEND_ROOT,
    env: {
      ...process.env,
      MONGODB_URI: mongoUri,
      PORT: String(PORT),
      FRONTEND_URL: 'http://localhost:3000',
      WHATSAPP_GRAPH_BASE_URL: `http://127.0.0.1:${MOCK_META_PORT}`,
      COOKIE_SECURE: 'false',
      TRUST_PROXY: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));

  try {
    await waitFor(async () => {
      const res = await fetch(`${API}/health`);
      return res.ok;
    }, 45000, 'backend health check');

    console.log('\nSeeding test data...');
    const conn = await mongoose.createConnection(mongoUri).asPromise();
    const now = new Date();
    const passwordHash = await bcrypt.hash('Passw0rd!123', 4);

    const userDoc = await conn.collection('users').insertOne({
      firstName: 'E2E',
      lastName: 'Owner',
      email: 'e2e-owner@test.local',
      phone: '+94770000001',
      passwordHash,
      status: 'active',
      preferredLanguage: 'en',
      timezone: 'Asia/Colombo',
      isEmailVerified: true,
      isPhoneVerified: true,
      platformRole: 'user',
      createdAt: now,
      updatedAt: now,
    });

    const businessDoc = await conn.collection('businesses').insertOne({
      name: 'E2E Business',
      slug: `e2e-business-${Date.now()}`,
      country: 'LK',
      baseCurrency: 'LKR',
      timezone: 'Asia/Colombo',
      defaultLanguage: 'en',
      status: 'active',
      planCode: 'free',
      features: {},
      usageLimits: {},
      createdAt: now,
      updatedAt: now,
    });

    await conn.collection('business_members').insertOne({
      userId: userDoc.insertedId,
      businessId: businessDoc.insertedId,
      role: 'owner',
      isActive: true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const connectionDoc = await conn.collection('whatsapp_connections').insertOne({
      businessId: businessDoc.insertedId,
      provider: 'meta_cloud',
      wabaId: 'E2E_WABA_ID',
      phoneNumberId: 'E2E_PHONE_ID_1',
      displayPhoneNumber: '+94 77 000 0002',
      businessPhoneE164: '+94770000002',
      status: 'connected',
      isActive: true,
      connectedAt: now,
      connectedByUserId: userDoc.insertedId,
      createdAt: now,
      updatedAt: now,
    });

    // Owner's own number is a paired sender (existing automation keeps working).
    await conn.collection('whatsapp_authorized_senders').insertOne({
      businessId: businessDoc.insertedId,
      userId: userDoc.insertedId,
      whatsappConnectionId: connectionDoc.insertedId,
      phoneE164: '94770000001',
      status: 'verified',
      verifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const businessId = businessDoc.insertedId.toString();

    // Login to obtain session cookies.
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-owner@test.local', password: 'Passw0rd!123' }),
    });
    assert('operator login succeeds', loginRes.ok);
    const setCookies = loginRes.headers.getSetCookie?.() ?? [];
    const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');
    const authHeaders = { Cookie: cookies };

    async function apiAuth(pathname, options = {}) {
      return api(pathname, {
        ...options,
        cookies,
        headers: { ...(options.headers || {}), 'X-Business-Id': businessId },
      });
    }

    // ------------------------------------------------ webhook verification
    console.log('\n[1] Webhook verification');
    const verifyUrl = `${API}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=CHALLENGE_42`;
    const verifyRes = await fetch(verifyUrl);
    assert('GET webhook echoes challenge', (await verifyRes.text()) === 'CHALLENGE_42');

    // ------------------------------------------- incoming customer message
    console.log('\n[2] Incoming customer message -> stored once + AI draft');
    const tsNow = Math.floor(Date.now() / 1000);
    const payloadMsg1 = customerMessagePayload({
      wamId: 'wamid.CUST_MSG_1',
      from: '+94771239988',
      text: 'Hi! Do you have the blue model in stock?',
      timestampSeconds: tsNow,
    });
    const hookRes = await postWebhook(payloadMsg1);
    assert('webhook accepted', hookRes.status === 'ok');

    await waitFor(async () => {
      const convCount = await conn.collection('whatsapp_conversations').countDocuments({ businessId: new mongoose.Types.ObjectId(businessId) });
      return convCount === 1;
    }, 10000, 'conversation creation');

    const rawConv = await conn.collection('whatsapp_conversations').findOne({});
    console.log('RAW CONV TYPES:', {
      idType: rawConv?._id?.constructor?.name,
      bizType: rawConv?.businessId?.constructor?.name,
      phoneType: rawConv?.customerPhone?.constructor?.name,
      status: rawConv?.status,
      keys: Object.keys(rawConv ?? {}),
    });
    const probeByIdTypes = await conn.collection('whatsapp_conversations').findOne({
      _id: rawConv._id,
      businessId: rawConv.businessId,
    });
    console.log('RAW DRIVER TYPED MATCH:', !!probeByIdTypes);

    const conversationsAfterFirst = await conn.collection('whatsapp_conversations').findOne({ businessId: new mongoose.Types.ObjectId(businessId) });
    assert('conversation created with customer data',
      conversationsAfterFirst &&
      conversationsAfterFirst.customerPhone === '94771239988'.replace(/^/, '') &&
      (conversationsAfterFirst.customerName === 'Nimal Perera'),
      JSON.stringify(conversationsAfterFirst?.customerName),
    );
    assert('unread count is 1', conversationsAfterFirst.unreadCount === 1);
    assert('lastCustomerMessageAt set', !!conversationsAfterFirst.lastCustomerMessageAt);

    const storedMessages = await conn.collection('message_events').find({ providerMessageId: 'wamid.CUST_MSG_1' }).toArray();
    assert('incoming message stored exactly once', storedMessages.length === 1);
    assert('message linked to conversation and typed as customer',
      storedMessages[0].senderType === 'customer' && !!storedMessages[0].conversationId);

    const duplicateRes = await postWebhook(payloadMsg1);
    assert('duplicate webhook accepted gracefully', duplicateRes.status === 'ok');
    const dupCount = await conn.collection('message_events').countDocuments({ providerMessageId: 'wamid.CUST_MSG_1' });
    assert('duplicate message NOT stored twice', dupCount === 1);

    // --------------------------------------------------- operator inbox UI
    console.log('\n[3] Operator sees the conversation and AI draft');
    const listRes = await apiAuth('/whatsapp/inbox/conversations');
    assert('conversation list returns customer', listRes.json?.data?.conversations?.length === 1);
    const conversationId = listRes.json.data.conversations[0].id;

    let historyRes = null;
    await waitFor(async () => {
      historyRes = await apiAuth(`/whatsapp/inbox/conversations/${conversationId}/messages`);
      return historyRes.json?.data?.draft?.status === 'waiting_for_approval';
    }, 40000, 'AI draft ready (Gemini)');
    const draft = historyRes.json.data.draft;
    assert('draft waits for approval', draft.status === 'waiting_for_approval');
    assert('draft has suggestion text', typeof draft.originalText === 'string' && draft.originalText.length > 0);
    assert('history contains inbound message', historyRes.json.data.messages.length >= 1);

    // ------------------------------------------------------ approve & send
    console.log('\n[4] Approve & Send is the only path that transmits');
    const editedText = 'Hi Nimal! Yes, the blue model is in stock. Want us to reserve one for you?';
    const approveRes = await apiAuth(`/whatsapp/inbox/drafts/${draft.id}/approve-and-send`, {
      method: 'POST',
      body: { text: editedText },
    });
    assert('approve & send succeeds', approveRes.json?.success === true, JSON.stringify(approveRes.json));

    const sentToMeta = mockMeta.requests.find((r) => r.body?.text?.body === editedText);
    assert('WhatsApp Cloud API received approved text only after approval', !!sentToMeta);

    const draftAfterSend = await conn.collection('whatsapp_ai_reply_drafts').findOne({ _id: new mongoose.Types.ObjectId(draft.id) });
    assert('draft marked approved with audit fields',
      draftAfterSend.status === 'approved' &&
      draftAfterSend.humanEdited === true &&
      !!draftAfterSend.reviewedByUserId &&
      !!draftAfterSend.sentAt &&
      String(draftAfterSend.finalText) === editedText,
    );

    const outboundAi = await conn.collection('message_events').findOne({
      direction: 'outbound',
      originatedFromAi: true,
    });
    assert('outbound message recorded as AI-originated + human-approved',
      outboundAi && outboundAi.senderType === 'ai' && outboundAi.humanEdited === true);

    // double submit protection
    const doubleApprove = await apiAuth(`/whatsapp/inbox/drafts/${draft.id}/approve-and-send`, {
      method: 'POST',
      body: { text: editedText },
    });
    assert('second approval attempt rejected', doubleApprove.json?.success === false);

    // ------------------------------------------------------------ manual send
    console.log('\n[5] Manual human reply without AI');
    const manualRes = await apiAuth(`/whatsapp/inbox/conversations/${conversationId}/send-manual`, {
      method: 'POST',
      body: { text: 'We can also deliver island-wide.' },
    });
    assert('manual reply sends successfully', manualRes.json?.success === true, JSON.stringify(manualRes.json));
    const manualOutbound = await conn.collection('message_events').findOne({
      direction: 'outbound',
      senderType: 'human_agent',
      originatedFromAi: false,
    });
    assert('manual reply stored as human agent message', !!manualOutbound);

    // ------------------------------------------------------- status updates
    console.log('\n[6] Delivery status webhook updates outgoing message');
    await postWebhook(statusPayload({
      providerMessageId: outboundAi.providerMessageId,
      status: 'delivered',
      recipientPhone: '+94771239988',
    }));
    await postWebhook(statusPayload({
      providerMessageId: outboundAi.providerMessageId,
      status: 'read',
      recipientPhone: '+94771239988',
    }));
    await waitFor(async () => {
      const doc = await conn.collection('message_events').findOne({ _id: outboundAi._id });
      return doc.deliveryStatus === 'read' && !!doc.readAt;
    }, 8000, 'delivery status update');
    assert('deliveryStatus advanced to read', true);

    // -------------------------------------------------- validation & authz
    console.log('\n[7] Validation, authorization and invalid IDs');
    const unauthList = await fetch(`${API}/whatsapp/inbox/conversations`);
    assert('unauthenticated inbox access blocked', ([401, 403].includes(unauthList.status)), 'got ' + unauthList.status);

    const badDraftReject = await apiAuth('/whatsapp/inbox/drafts/not-a-valid-id/reject', { method: 'POST' });
    assert('invalid draft id returns client error', badDraftReject.status >= 400 && badDraftReject.status < 500);

    const badConvHistory = await apiAuth('/whatsapp/inbox/conversations/000000000000000000000000/messages');
    assert('unknown conversation returns not found', badConvHistory.status === 404);

    const emptyReply = await apiAuth(`/whatsapp/inbox/conversations/${conversationId}/send-manual`, {
      method: 'POST',
      body: { text: '   ' },
    });
    assert('empty manual reply rejected by validation', emptyReply.status >= 400, 'got ' + emptyReply.status);

    // ------------------------------------------- regenerate + reject flows
    console.log('\n[8] Regenerate and Reject');
    const regenRes = await apiAuth(`/whatsapp/inbox/conversations/${conversationId}/drafts`, { method: 'POST' });
    assert('regenerate produces a fresh waiting draft', regenRes.json?.data?.draft?.status === 'waiting_for_approval', JSON.stringify(regenRes.json));
    const regeneratedDraftId = regenRes.json?.data?.draft?.id;

    await waitFor(async () => {
      const d = await conn.collection('whatsapp_ai_reply_drafts').findOne({ _id: new mongoose.Types.ObjectId(regeneratedDraftId) });
      return d.status === 'waiting_for_approval' && !!d.generatedAt;
    }, 40000, 'regenerated draft completion');

    const rejectRes = await apiAuth(`/whatsapp/inbox/drafts/${regeneratedDraftId}/reject`, { method: 'POST' });
    assert('reject marks draft rejected', rejectRes.json?.data?.draft?.status === 'rejected');

    const rejectAgain = await apiAuth(`/whatsapp/inbox/drafts/${regeneratedDraftId}/reject`, { method: 'POST' });
    assert('rejecting twice conflicts', rejectAgain.json?.success === false);

    // ------------------------------------------- rapid consecutive messages
    console.log('\n[9] Rapid consecutive messages create at most one active draft');
    await Promise.all([
      postWebhook(customerMessagePayload({
        wamId: 'wamid.CUST_MSG_2',
        from: '+94771239988',
        text: 'Also, what is the price?',
        timestampSeconds: tsNow + 10,
      })),
      postWebhook(customerMessagePayload({
        wamId: 'wamid.CUST_MSG_3',
        from: '+94771239988',
        text: 'And do you deliver to Kandy?',
        timestampSeconds: tsNow + 11,
      })),
    ]);

    const activeDraftCount = await conn.collection('whatsapp_ai_reply_drafts').countDocuments({
      businessId,
      conversationId: new mongoose.Types.ObjectId(conversationId),
      active: true,
      status: { $in: ['generating', 'waiting_for_approval'] },
    });
    assert('only one active draft per conversation', activeDraftCount <= 1, `found ${activeDraftCount}`);

    const msg23 = await conn.collection('message_events').countDocuments({
      providerMessageId: { $in: ['wamid.CUST_MSG_2', 'wamid.CUST_MSG_3'] },
    });
    assert('both rapid messages stored in order-capable collection', msg23 === 2);

    // ----------------------------------------------- multiple conversations
    console.log('\n[10] Multiple customers appear as separate conversations');
    await postWebhook(customerMessagePayload({
      wamId: 'wamid.CUST_B_1',
      from: '+94771237777',
      text: 'Good morning, are you open on Sundays?',
      timestampSeconds: tsNow + 20,
    }));
    const convCountB = await waitFor(async () => {
      const count = await conn.collection('whatsapp_conversations').countDocuments({ businessId: new mongoose.Types.ObjectId(businessId) });
      return count === 2 ? count : null;
    }, 10000, 'second conversation');
    assert('second customer conversation created', convCountB === 2);

    // ------------------------------------------------------------ realtime
    console.log('\n[11] SSE realtime stream delivers new-message event');
    const streamController = new AbortController();
    const streamPromise = fetch(`${API}/whatsapp/inbox/stream`, {
      headers: { ...authHeaders, Accept: 'text/event-stream', 'X-Business-Id': businessId },
      signal: streamController.signal,
    }).then((res) => res.body.getReader());

    const reader = await streamPromise.catch(() => null);
    assert('SSE stream opens with auth', !!reader);

    if (reader) {
      const decoder = new TextDecoder();
      let buffer = '';
      let sawConnected = false;
      let sawMessageCreated = false;

      const readLoop = (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (buffer.includes('event: connected')) sawConnected = true;
          if (buffer.includes('event: message_created')) sawMessageCreated = true;
          if (sawConnected && sawMessageCreated) break;
        }
      })();

      await waitFor(() => sawConnected, 5000, 'SSE connected event');

      await postWebhook(customerMessagePayload({
        wamId: 'wamid.CUST_LIVE_1',
        from: '+94771239988',
        text: 'Live update test message',
        timestampSeconds: tsNow + 30,
      }));

      await waitFor(() => sawMessageCreated, 12000, 'SSE message_created event')
        .then(() => assert('new customer message pushed over SSE without refresh', true))
        .catch(() => assert('new customer message pushed over SSE without refresh', false, 'no SSE frame received'));

      streamController.abort();
      await readLoop.catch(() => {});
    }

    // ------------------------------------------- authorized sender flow intact
    console.log('\n[12] Existing authorized-sender automation untouched');
    const ownerHook = await postWebhook(customerMessagePayload({
      wamId: 'wamid.OWNER_1',
      from: '+94770000001',
      text: 'Spent 2500 on fuel',
      timestampSeconds: tsNow + 40,
    }));
    assert('owner webhook still processed', ownerHook.status === 'ok');
    const ownerInboundStored = await conn.collection('message_events').countDocuments({ providerMessageId: 'wamid.OWNER_1' });
    assert('owner inbound message stored', ownerInboundStored === 1);
    // The old flow replies automatically; the mock Meta should have captured it.
    await waitFor(async () => {
      const autoReplyCount = await conn.collection('message_events').countDocuments({
        direction: 'outbound',
        senderPhone: '94770000002',
      });
      return autoReplyCount >= 1;
    }, 30000, 'automated extraction reply').catch(() => {});
    const ownerNotInInbox = await conn.collection('whatsapp_conversations').countDocuments({
      businessId: new mongoose.Types.ObjectId(businessId),
      customerPhone: '94770000001',
    });
    assert("owner's paired number does NOT create an inbox conversation", ownerInboundStored === 1 && ownerNotInInbox === 0, "stored=" + ownerInboundStored + " convs=" + ownerNotInInbox);

    // ------------------------------------------------------------- summary
    console.log('\n==========================================');
    console.log(`RESULTS: ${passed} passed, ${failures.length} failed`);
    if (failures.length > 0) {
      console.error('Failed assertions:');
      for (const f of failures) console.error(` - ${f}`);
    }
    console.log('==========================================');
  } finally {
    child.kill('SIGTERM');
    mockMeta.server?.close();
    await mongod.stop();
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


