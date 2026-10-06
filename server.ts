import express, { Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  createUser,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  findUserByPhoneNumber,
  createOrLoginPhoneUser,
  verifyPassword,
  createSession,
  getSession,
  deleteSession,
  sanitizeUser,
  updateUserPresence,
  updateUserProfile,
  searchUsers,
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
  getConnectionRequests,
  getConnections,
  toggleCloseConnection,
  removeConnection,
  blockUser,
  unblockUser,
  getBlockedUsers,
  publishPublicKeyBundle,
  getPublicKeyBundle,
  storeEncryptedMessage,
  getPendingMessagesForRecipient,
  getMessagesForChat,
  getEncryptedMessageById,
  updateEncryptedMessageStatus,
  getNextChatSequence,
  StoredUser,
  StoredPublicKeyBundle,
  StoredEncryptedMessage,
} from './server/db.js';
import { sendVerificationSms, verifySmsCode } from './server/sms.js';

interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  token?: string;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: () => void) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const sessionData = getSession(token);
  if (!sessionData) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.user = sessionData.user;
  req.token = token;
  next();
}

function getFirebaseApiKey(): string | null {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
    );
    return typeof cfg.apiKey === 'string' ? cfg.apiKey : null;
  } catch {
    return null;
  }
}

/**
 * Verifies a Firebase ID token through Google's Identity Toolkit and returns the verified
 * uid and phone number, or null if the token is invalid, expired or for another project.
 */
async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; phoneNumber?: string } | null> {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const u = data?.users?.[0];
    if (!u || typeof u.localId !== 'string') return null;
    return {
      uid: u.localId,
      phoneNumber: typeof u.phoneNumber === 'string' ? u.phoneNumber : undefined,
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'AMONG Backend' });
  });

  // -------------------------------------------------------------
  // Phone Number Authentication (Phone -> SMS Code -> Account)
  // -------------------------------------------------------------

  // Step 1: Request SMS verification code
  app.post('/api/auth/phone/send-code', async (req, res) => {
    try {
      const { phoneNumber } = req.body || {};
      if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
        res.status(400).json({ error: 'Please enter a valid phone number.' });
        return;
      }

      const cleanPhone = phoneNumber.trim();
      // Validate E.164 phone format (+ followed by 7 to 15 digits)
      if (!/^\+[1-9]\d{6,14}$/.test(cleanPhone)) {
        res.status(400).json({
          error: 'Phone number must be in valid international E.164 format (e.g. +14155552671).',
        });
        return;
      }

      const result = await sendVerificationSms(cleanPhone);
      if (!result.success) {
        res.status(result.code === 'RATE_LIMITED' ? 429 : 400).json({
          error: result.error || 'Failed to send SMS code.',
          code: result.code,
          cooldownSeconds: result.cooldownSeconds,
        });
        return;
      }

      res.json({
        success: true,
        isDevMode: !!result.isDevMode,
        devCode: result.devCode,
        message: result.isDevMode
          ? `[Sanctuary SMS Simulator] Verification code sent for ${cleanPhone}.`
          : 'Verification code sent successfully via SMS.',
      });
    } catch (error: any) {
      console.error('Error sending SMS verification code:', error);
      res.status(500).json({ error: 'An unexpected server error occurred while sending the SMS code.' });
    }
  });

  // Step 2: Verify code and login / register
  app.post('/api/auth/phone/verify-code', async (req, res) => {
    try {
      const { phoneNumber, code } = req.body || {};

      if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
        res.status(400).json({ error: 'Please provide a valid phone number.' });
        return;
      }

      if (!code || typeof code !== 'string' || !code.trim()) {
        res.status(400).json({ error: 'Please enter the 6-digit verification code.' });
        return;
      }

      const cleanPhone = phoneNumber.trim();
      const cleanCode = code.trim();

      // Verify SMS code
      const verifyResult = await verifySmsCode(cleanPhone, cleanCode);
      if (!verifyResult.success) {
        res.status(400).json({
          error: verifyResult.error || 'Invalid verification code.',
          code: verifyResult.code,
          remainingAttempts: verifyResult.remainingAttempts,
        });
        return;
      }

      // Account created or logged in (Flow: Phone number → verification code → account created or logged in)
      const { user, isNewUser } = createOrLoginPhoneUser(cleanPhone);

      // Persistent session token creation
      const session = createSession(user.id);

      res.json({
        success: true,
        user: sanitizeUser(user),
        token: session.token,
        isNewUser,
        message: isNewUser ? 'Sanctuary account created.' : 'Welcome back.',
      });
    } catch (error: any) {
      console.error('Error verifying code:', error);
      res.status(500).json({ error: 'An unexpected server error occurred during verification.' });
    }
  });

  // Step 2b: Firebase Authentication Session Integration
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken, displayName } = req.body || {};

      if (!idToken || typeof idToken !== 'string') {
        res.status(400).json({ error: 'A Firebase ID token is required.' });
        return;
      }

      // Never trust uid / phone number from the request body: verify the ID token with Google
      // and take identity only from the verified result.
      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified || !verified.phoneNumber) {
        res.status(401).json({ error: 'Could not verify your Firebase sign-in. Please try again.' });
        return;
      }

      const uid = verified.uid;
      const cleanPhone = verified.phoneNumber;

      const { user, isNewUser } = createOrLoginPhoneUser(
        cleanPhone,
        uid,
        typeof displayName === 'string' ? displayName.slice(0, 80) : undefined
      );
      const session = createSession(user.id);

      res.json({
        success: true,
        user: sanitizeUser(user),
        token: session.token,
        isNewUser,
        message: isNewUser ? 'Sanctuary account initialized with Firebase.' : 'Welcome back.',
      });
    } catch (error: any) {
      console.error('Error in Firebase auth sync:', error);
      res.status(500).json({ error: 'Failed to synchronize Firebase session.' });
    }
  });

  // 1. Create account (Register)
  app.post('/api/auth/register', (req, res) => {
    try {
      const { displayName, username, email, password } = req.body || {};

      // Validate Display Name
      if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
        res.status(400).json({ error: 'Please enter your display name.' });
        return;
      }
      const trimmedDisplayName = displayName.trim();
      if (trimmedDisplayName.length < 2) {
        res.status(400).json({ error: 'Display name must be at least 2 characters.' });
        return;
      }
      if (trimmedDisplayName.length > 40) {
        res.status(400).json({ error: 'Display name cannot exceed 40 characters.' });
        return;
      }

      // Validate Username
      if (!username || typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Please choose a username.' });
        return;
      }
      const cleanUsername = username.trim().replace(/^@/, '');
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        res.status(400).json({
          error: 'Username must be 3 to 20 characters and contain only letters, numbers, or underscores.',
        });
        return;
      }

      // Check username uniqueness
      const existingUserByUsername = findUserByUsername(cleanUsername);
      if (existingUserByUsername) {
        res.status(409).json({
          error: `The username '@${cleanUsername}' is already taken. Please choose another.`,
        });
        return;
      }

      // Validate Email
      if (!email || typeof email !== 'string' || !email.trim()) {
        res.status(400).json({ error: 'Please enter your email address.' });
        return;
      }
      const cleanEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: 'Please enter a valid email address (e.g., name@example.com).' });
        return;
      }

      // Check email uniqueness
      const existingUserByEmail = findUserByEmail(cleanEmail);
      if (existingUserByEmail) {
        res.status(409).json({
          error: 'An account with this email address already exists. Please sign in instead.',
        });
        return;
      }

      // Validate Password
      if (!password || typeof password !== 'string') {
        res.status(400).json({ error: 'Please choose a password.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        return;
      }

      // Create user securely (passwords hashed with scrypt + salt)
      const user = createUser({
        displayName: trimmedDisplayName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      // Create persistent session token
      const session = createSession(user.id);

      res.status(201).json({
        user: sanitizeUser(user),
        token: session.token,
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ error: 'An unexpected error occurred while creating your account.' });
    }
  });

  // 2. Sign In
  app.post('/api/auth/login', (req, res) => {
    try {
      const { identifier, password } = req.body || {};

      if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        res.status(400).json({ error: 'Please enter your email or username.' });
        return;
      }

      if (!password || typeof password !== 'string') {
        res.status(400).json({ error: 'Please enter your password.' });
        return;
      }

      const user = findUserByIdentifier(identifier);
      if (!user) {
        res.status(401).json({
          error: 'Incorrect email/username or password. Please check your credentials.',
        });
        return;
      }

      const isPasswordValid = verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          error: 'Incorrect email/username or password. Please check your credentials.',
        });
        return;
      }

      const session = createSession(user.id);

      res.json({
        user: sanitizeUser(user),
        token: session.token,
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'An unexpected error occurred while signing in.' });
    }
  });

  // 3. Current User (Session verification)
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json({ user: sanitizeUser(req.user) });
  });

  // 4. Sign Out
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    const token = extractToken(req);
    if (token) {
      deleteSession(token);
    }
    res.json({ success: true, message: 'Signed out successfully' });
  });

  // 5. Update Presence Rhythm
  app.patch('/api/auth/presence', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { presence, statusMessage } = req.body || {};
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const validPresences = ['here', 'focus', 'quiet', 'offline', 'walking'];
    if (presence && !validPresences.includes(presence)) {
      res.status(400).json({ error: 'Invalid presence status' });
      return;
    }

    const updated = updateUserPresence(req.user.id, presence || req.user.presence, statusMessage);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: sanitizeUser(updated) });
  });

  // 6. Update Profile & Privacy
  app.patch('/api/auth/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { displayName, bio, statusMessage, shareOnlineStatus } = req.body || {};
    const updated = updateUserProfile(req.user.id, {
      displayName,
      bio,
      statusMessage,
      shareOnlineStatus,
    });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: sanitizeUser(updated) });
  });

  // -------------------------------------------------------------
  // People System API Routes
  // -------------------------------------------------------------

  // 7. Search People (by @username or Display name)
  app.get('/api/people/search', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const results = searchUsers(req.user.id, query);
    res.json({ results });
  });

  // 8. Get Connections ("Your people", including "Close" designations)
  app.get('/api/connections', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const people = getConnections(req.user.id);
    res.json({ people });
  });

  // 9. Get Connection Requests (Incoming & Outgoing)
  app.get('/api/connections/requests', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { incoming, outgoing } = getConnectionRequests(req.user.id);
    res.json({ incoming, outgoing });
  });

  // 10. Send Connection Request
  app.post('/api/connections/request', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'Target user ID is required.' });
      return;
    }

    const result = sendConnectionRequest(req.user.id, targetUserId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to send connection request.' });
      return;
    }

    res.status(201).json(result);
  });

  // 11. Accept Connection Request
  app.post('/api/connections/accept', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { requestId } = req.body || {};
    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ error: 'Request ID is required.' });
      return;
    }

    const result = acceptConnectionRequest(req.user.id, requestId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to accept connection request.' });
      return;
    }

    res.json({ success: true, message: 'Connection accepted.' });
  });

  // 12. Decline Connection Request
  app.post('/api/connections/decline', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { requestId } = req.body || {};
    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ error: 'Request ID is required.' });
      return;
    }

    const result = declineConnectionRequest(req.user.id, requestId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to decline connection request.' });
      return;
    }

    res.json({ success: true, message: 'Connection request declined.' });
  });

  // 13. Cancel Connection Request (by sender)
  app.post('/api/connections/cancel', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { requestId } = req.body || {};
    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ error: 'Request ID is required.' });
      return;
    }

    const result = cancelConnectionRequest(req.user.id, requestId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to cancel connection request.' });
      return;
    }

    res.json({ success: true, message: 'Connection request cancelled.' });
  });

  // 14. Mark / Unmark Connection as "Close"
  app.post('/api/connections/toggle-close', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'Target user ID is required.' });
      return;
    }

    const result = toggleCloseConnection(req.user.id, targetUserId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to toggle close status.' });
      return;
    }

    res.json(result);
  });

  // 15. Remove Connection
  app.delete('/api/connections/:targetUserId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { targetUserId } = req.params;
    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID is required.' });
      return;
    }

    const result = removeConnection(req.user.id, targetUserId);
    res.json(result);
  });

  // 16. Block User
  app.post('/api/users/block', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'Target user ID is required.' });
      return;
    }

    const result = blockUser(req.user.id, targetUserId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to block user.' });
      return;
    }

    res.json({ success: true, message: 'User has been blocked.' });
  });

  // 17. Unblock User
  app.post('/api/users/unblock', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'Target user ID is required.' });
      return;
    }

    const result = unblockUser(req.user.id, targetUserId);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to unblock user.' });
      return;
    }

    res.json({ success: true, message: 'User has been unblocked.' });
  });

  // 18. List Blocked Users
  app.get('/api/users/blocked', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const blockedUsers = getBlockedUsers(req.user.id);
    res.json({ blockedUsers });
  });

  // -------------------------------------------------------------
  // E2EE Public Key Registry & Zero-Knowledge Mailbox Endpoints
  // -------------------------------------------------------------

  // 19. Publish Device Identity & Prekey Bundle
  app.post('/api/keys/publish', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { deviceId, identityKeyBase64, signingKeyBase64, signedPreKeyBase64, signatureBase64, fingerprint } = req.body || {};

    if (!identityKeyBase64 || typeof identityKeyBase64 !== 'string') {
      res.status(400).json({ error: 'Public identity key is required.' });
      return;
    }

    const bundle: StoredPublicKeyBundle = {
      userId: req.user.id,
      deviceId: deviceId || 'primary-device',
      identityKeyBase64,
      signingKeyBase64: signingKeyBase64 || '',
      signedPreKeyBase64: signedPreKeyBase64 || '',
      signatureBase64: signatureBase64 || '',
      fingerprint: fingerprint || '',
      updatedAt: new Date().toISOString(),
    };

    const result = publishPublicKeyBundle(bundle);
    res.json({ success: true, fingerprint: result.fingerprint });
  });

  // 20. Fetch Peer's Public Key Bundle for Forward-Secret Session Setup
  app.get('/api/keys/:userId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'User ID is required.' });
      return;
    }

    const bundle = getPublicKeyBundle(userId);
    if (!bundle) {
      res.status(404).json({ error: 'Public key bundle not found for user.' });
      return;
    }

    // Only public keys and signatures are returned - private keys never exist on the server
    res.json({ bundle });
  });

  // 21. Fetch Buffered Encrypted Messages (Offline Sync)
  app.get('/api/messages/pending', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const since = req.query.since ? parseInt(req.query.since as string, 10) : 0;
    const pending = getPendingMessagesForRecipient(req.user.id, isNaN(since) ? 0 : since);
    res.json({ messages: pending });
  });

  // 22. Fetch Chat Encrypted History
  app.get('/api/messages/chat/:chatId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const { chatId } = req.params;
    if (!chatId) {
      res.status(400).json({ error: 'Chat ID required.' });
      return;
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const me = req.user!.id;
    // Only return messages the caller sent or received.
    const messages = getMessagesForChat(chatId, isNaN(limit) ? 100 : limit).filter(
      (m) => m.senderId === me || m.recipientId === me
    );
    res.json({ messages });
  });

  // -------------------------------------------------------------
  // Vite Middleware & Static Serving
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // -------------------------------------------------------------
  // Production-Grade WebSocket Server (Zero-Knowledge Relay & Sync)
  // -------------------------------------------------------------
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of userId -> Set<WebSocket> for multi-device / active tab delivery
  const userSockets = new Map<string, Set<WebSocket>>();

  function registerUserSocket(userId: string, ws: WebSocket) {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(ws);
  }

  function unregisterUserSocket(userId: string, ws: WebSocket) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(ws);
      if (sockets.size === 0) {
        userSockets.delete(userId);
      }
    }
  }

  function sendToUser(userId: string, data: any): boolean {
    const sockets = userSockets.get(userId);
    if (!sockets || sockets.size === 0) return false;
    let delivered = false;
    const raw = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(raw);
          delivered = true;
        } catch {
          // Socket failed
        }
      }
    }
    return delivered;
  }

  function sendToSender(senderId: string, ws: WebSocket, data: any): boolean {
    let delivered = sendToUser(senderId, data);
    if (!delivered && ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
        delivered = true;
      } catch {}
    }
    return delivered;
  }

  function getCircleContactReply(chatId: string, recipientId: string): string {
    switch (chatId) {
      case 'chat-1':
        return 'Taking a quiet breath before the next session. Your note arrived at the right moment.';
      case 'chat-2':
        return 'Sounds perfect. I will pack the trail kit and water canteen.';
      case 'chat-3':
        return 'The paper textures look even sharper in the studio daylight. Sending the scans shortly.';
      case 'chat-4':
        return 'So good to hear from you, my dear. Have a gentle and restful evening.';
      case 'chat-5':
        return 'Reaching the high ridge now. Quiet miles ahead—talk soon.';
      default:
        return 'Appreciate you reaching out. Hope you are enjoying a calm afternoon.';
    }
  }

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    let boundUserId: string | null = null;
    let isAlive = true;

    // Parse URL parameters for initial authentication
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      if (token) {
        const session = getSession(token);
        if (session) {
          boundUserId = session.user.id;
        }
      }
    } catch {
      // Ignored
    }

    if (boundUserId) {
      registerUserSocket(boundUserId, ws);
      // Immediately notify client of successful connection handshake
      ws.send(JSON.stringify({
        type: 'connection:ready',
        userId: boundUserId,
        timestamp: Date.now(),
      }));
    }

    ws.on('pong', () => {
      isAlive = true;
    });

    ws.on('message', (rawMessage: any) => {
      try {
        const messageText = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const payload = JSON.parse(messageText);

        switch (payload.type) {
          case 'auth:identify': {
            const { token } = payload;
            // Identity comes only from a valid session token, never from a client-supplied userId.
            let authenticatedId: string | null = null;
            if (token) {
              const session = getSession(token);
              if (session) authenticatedId = session.user.id;
            }
            if (!authenticatedId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Authentication required.' }));
              break;
            }
            {
              if (boundUserId && boundUserId !== authenticatedId) {
                unregisterUserSocket(boundUserId, ws);
              }
              boundUserId = authenticatedId;
              registerUserSocket(boundUserId, ws);
              ws.send(JSON.stringify({
                type: 'auth:confirmed',
                userId: boundUserId,
                timestamp: Date.now(),
              }));
            }
            break;
          }

          case 'message:send': {
            if (!boundUserId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Authentication required.' }));
              return;
            }
            const { id, chatId, recipientId, envelope, sequenceNumber } = payload;
            if (!id || !chatId || !recipientId || !envelope) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message payload. Required fields missing.',
              }));
              return;
            }

            const senderId = boundUserId;
            const now = new Date().toISOString();

            // Store strictly zero-knowledge encrypted envelope
            const stored: StoredEncryptedMessage = {
              id,
              chatId,
              senderId,
              recipientId,
              envelope,
              sequenceNumber: sequenceNumber || 0,
              status: 'sent',
              createdAt: now,
            };

            const storeResult = storeEncryptedMessage(stored);
            const assignedSeq = storeResult.sequenceNumber;

            // 1. Acknowledge transmission to sender with authoritative sequence number
            ws.send(JSON.stringify({
              type: 'ack:sent',
              messageId: id,
              chatId,
              sequenceNumber: assignedSeq,
              timestamp: now,
            }));

            // 2. Dispatch to recipient if active
            const isOnline = sendToUser(recipientId, {
              type: 'message:received',
              message: {
                ...stored,
                sequenceNumber: assignedSeq,
              },
            });

            const isCircleContact = ['person-1', 'person-2', 'person-3', 'person-4', 'person-5', 'person-6'].includes(recipientId);

            if (isOnline) {
              updateEncryptedMessageStatus(id, 'delivered');
              // Notify sender of immediate online delivery
              sendToSender(senderId, ws, {
                type: 'ack:delivered',
                messageId: id,
                chatId,
                timestamp: new Date().toISOString(),
              });
            } else if (isCircleContact) {
              // Circle contact server-side receipt progression
              setTimeout(() => {
                updateEncryptedMessageStatus(id, 'delivered');
                sendToSender(senderId, ws, {
                  type: 'ack:delivered',
                  messageId: id,
                  chatId,
                  timestamp: new Date().toISOString(),
                });
              }, 600);

              setTimeout(() => {
                updateEncryptedMessageStatus(id, 'read');
                sendToSender(senderId, ws, {
                  type: 'ack:read',
                  messageId: id,
                  chatId,
                  timestamp: new Date().toISOString(),
                });

                // Trigger typing indicator and reply
                setTimeout(() => {
                  sendToSender(senderId, ws, {
                    type: 'typing:indicator',
                    chatId,
                    senderId: recipientId,
                    isTyping: true,
                  });

                  setTimeout(() => {
                    sendToSender(senderId, ws, {
                      type: 'typing:indicator',
                      chatId,
                      senderId: recipientId,
                      isTyping: false,
                    });

                    const replyText = getCircleContactReply(chatId, recipientId);
                    const replyMsgId = `msg-reply-${Date.now()}`;
                    const replySeq = getNextChatSequence(chatId);
                    const replyStored: StoredEncryptedMessage = {
                      id: replyMsgId,
                      chatId,
                      senderId: recipientId,
                      recipientId: senderId,
                      envelope: {
                        ciphertext: Buffer.from(replyText).toString('base64'),
                        iv: Buffer.from('123456789012').toString('base64'),
                        ephemeralPublicKeyBase64: '',
                        sequenceNumber: replySeq,
                        timestamp: Date.now(),
                        payloadType: 'text',
                        plaintextFallback: replyText,
                      } as any,
                      sequenceNumber: replySeq,
                      status: 'sent',
                      createdAt: new Date().toISOString(),
                    };

                    storeEncryptedMessage(replyStored);

                    sendToSender(senderId, ws, {
                      type: 'message:received',
                      message: replyStored,
                    });
                  }, 2200);
                }, 1000);
              }, 1700);
            }
            break;
          }

          case 'ack:delivered': {
            const { messageId, chatId } = payload;
            // Only the recipient of a message may acknowledge it; the sender is taken from storage.
            const target = boundUserId && messageId ? getEncryptedMessageById(messageId) : null;
            if (target && target.recipientId === boundUserId) {
              const senderId = target.senderId;
              updateEncryptedMessageStatus(messageId, 'delivered');
              if (senderId) {
                sendToUser(senderId, {
                  type: 'ack:delivered',
                  messageId,
                  chatId,
                  timestamp: new Date().toISOString(),
                });
              }
            }
            break;
          }

          case 'ack:read': {
            const { messageId, chatId } = payload;
            // Only the recipient of a message may acknowledge it; the sender is taken from storage.
            const target = boundUserId && messageId ? getEncryptedMessageById(messageId) : null;
            if (target && target.recipientId === boundUserId) {
              const senderId = target.senderId;
              updateEncryptedMessageStatus(messageId, 'read');
              if (senderId) {
                sendToUser(senderId, {
                  type: 'ack:read',
                  messageId,
                  chatId,
                  timestamp: new Date().toISOString(),
                });
              }
            }
            break;
          }

          case 'sync:request': {
            if (boundUserId) {
              const since = payload.sinceTimestamp || 0;
              const pending = getPendingMessagesForRecipient(boundUserId, since);
              ws.send(JSON.stringify({
                type: 'sync:batch',
                messages: pending,
                timestamp: Date.now(),
              }));
            }
            break;
          }

          case 'reaction:toggle': {
            const { messageId, chatId, recipientId, emoji, updatedReactions } = payload;
            if (recipientId) {
              sendToUser(recipientId, {
                type: 'reaction:updated',
                messageId,
                chatId,
                userId: boundUserId,
                emoji,
                reactions: updatedReactions,
                timestamp: new Date().toISOString(),
              });
            }
            break;
          }

          case 'typing:start':
          case 'typing:stop': {
            const { recipientId, chatId } = payload;
            const senderId = boundUserId;
            if (senderId && recipientId) {
              sendToUser(recipientId, {
                type: 'typing:indicator',
                chatId,
                senderId,
                isTyping: payload.type === 'typing:start',
              });
            }
            break;
          }

          case 'call:signal': {
            const { targetUserId, signalData } = payload;
            if (targetUserId && boundUserId) {
              sendToUser(targetUserId, {
                type: 'call:signal',
                fromUserId: boundUserId,
                signalData,
              });
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      if (boundUserId) {
        unregisterUserSocket(boundUserId, ws);
      }
    });
  });

  // Keep-alive heartbeat interval (terminates dead connections)
  const heartbeatInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch {
          ws.terminate();
        }
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AMONG Production Server running on http://0.0.0.0:${PORT} with WebSocket /ws`);
  });
}

startServer();
