import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface StoredUser {
  id: string;
  phoneNumber: string; // E.164 formatted e.g. +14155552671
  displayName: string;
  username: string;
  usernameLower: string;
  email?: string;
  emailLower?: string;
  passwordHash?: string;
  avatarColor: string;
  initials: string;
  bio: string;
  presence: 'here' | 'focus' | 'quiet' | 'offline' | 'walking';
  statusMessage: string;
  shareOnlineStatus: boolean;
  closeUserIds: string[];
  createdAt: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredPhoneVerification {
  phoneNumber: string;
  codeHash?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  expiresAt: string;
  verified: boolean;
}

export interface StoredConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface StoredConnection {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

export interface StoredBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface StoredPublicKeyBundle {
  userId: string;
  deviceId: string;
  identityKeyBase64: string; // Public ECDH P-256 key (SPKI base64)
  signingKeyBase64: string; // Public ECDSA P-256 key (SPKI base64)
  signedPreKeyBase64: string; // Public ephemeral ECDH prekey (SPKI base64)
  signatureBase64: string; // ECDSA signature over prekey
  fingerprint: string; // SHA-256 fingerprint
  updatedAt: string;
}

export interface StoredEncryptedEnvelope {
  version: '1';
  algorithm: 'AES-256-GCM';
  iv: string; // Base64 12 bytes
  ciphertext: string; // Base64
  tagLength: 128;
  senderFingerprint: string;
  ephemeralPublicKeyBase64: string;
  sequenceNumber: number;
  timestamp: number;
  payloadType: 'text' | 'photo' | 'audio' | 'file';
  keyId?: string;
}

export interface StoredEncryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  envelope: StoredEncryptedEnvelope;
  sequenceNumber: number;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: StoredSession[];
  phoneVerifications: StoredPhoneVerification[];
  connectionRequests: StoredConnectionRequest[];
  connections: StoredConnection[];
  blocks: StoredBlock[];
  publicKeyBundles: StoredPublicKeyBundle[];
  encryptedMessages: StoredEncryptedMessage[];
  chatSequences: Record<string, number>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'auth_store.json');

const AVATAR_MONOCHROME_TONES = [
  'bg-zinc-900 text-zinc-100',
  'bg-zinc-800 text-zinc-100',
  'bg-zinc-700 text-zinc-100',
  'bg-zinc-950 text-zinc-200',
  'bg-zinc-850 text-zinc-100',
];

function ensureDbExists(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let db: DatabaseSchema;
  if (!fs.existsSync(DB_FILE)) {
    db = {
      users: [],
      sessions: [],
      phoneVerifications: [],
      connectionRequests: [],
      connections: [],
      blocks: [],
      publicKeyBundles: [],
      encryptedMessages: [],
      chatSequences: {},
    };
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data) as DatabaseSchema;
    } catch (err) {
      console.error('Error reading auth database, resetting safely:', err);
      db = {
        users: [],
        sessions: [],
        phoneVerifications: [],
        connectionRequests: [],
        connections: [],
        blocks: [],
        publicKeyBundles: [],
        encryptedMessages: [],
        chatSequences: {},
      };
    }
  }

  if (!Array.isArray(db.connectionRequests)) db.connectionRequests = [];
  if (!Array.isArray(db.connections)) db.connections = [];
  if (!Array.isArray(db.blocks)) db.blocks = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!Array.isArray(db.phoneVerifications)) db.phoneVerifications = [];
  if (!Array.isArray(db.publicKeyBundles)) db.publicKeyBundles = [];
  if (!Array.isArray(db.encryptedMessages)) db.encryptedMessages = [];
  if (!db.chatSequences || typeof db.chatSequences !== 'object') db.chatSequences = {};

  let modified = false;

  // Sanitize any existing avatar colors to strict monochrome
  for (const user of db.users) {
    if (!user.avatarColor || user.avatarColor.includes('gradient') || user.avatarColor.includes('from-')) {
      user.avatarColor = 'bg-zinc-900 text-zinc-100';
      modified = true;
    }
  }
  for (let i = 0; i < db.users.length; i++) {
    const user = db.users[i];
    if (!Array.isArray(user.closeUserIds)) {
      user.closeUserIds = [];
      modified = true;
    }
    if (typeof user.bio !== 'string') {
      user.bio = 'Seeking calm conversations in the sanctuary.';
      modified = true;
    }
    if (typeof user.shareOnlineStatus !== 'boolean') {
      user.shareOnlineStatus = true;
      modified = true;
    }
    if (!user.phoneNumber) {
      if (user.usernameLower === 'elena') {
        user.phoneNumber = '+14155550101';
      } else if (user.usernameLower === 'siobhan') {
        user.phoneNumber = '+14155550102';
      } else {
        user.phoneNumber = `+1555000${1000 + i}`;
      }
      modified = true;
    }
  }

  // Seed two realistic peaceful accounts if users table is empty
  if (db.users.length === 0) {
    const salt1 = crypto.randomBytes(16).toString('hex');
    const hash1 = `${salt1}:${crypto.scryptSync('password123', salt1, 64).toString('hex')}`;
    const salt2 = crypto.randomBytes(16).toString('hex');
    const hash2 = `${salt2}:${crypto.scryptSync('password123', salt2, 64).toString('hex')}`;

    const seedUser1: StoredUser = {
      id: 'seed-user-elena',
      phoneNumber: '+14155550101',
      displayName: 'Elena Vance',
      username: 'elena',
      usernameLower: 'elena',
      email: 'elena@among.local',
      emailLower: 'elena@among.local',
      passwordHash: hash1,
      avatarColor: 'bg-zinc-900 text-zinc-100',
      initials: 'EV',
      bio: 'Archivist & quiet gardener. Embracing slower hours.',
      presence: 'quiet',
      statusMessage: 'Reading by the window',
      shareOnlineStatus: true,
      closeUserIds: [],
      createdAt: new Date().toISOString(),
    };

    const seedUser2: StoredUser = {
      id: 'seed-user-siobhan',
      phoneNumber: '+14155550102',
      displayName: 'Siobhan Chen',
      username: 'siobhan',
      usernameLower: 'siobhan',
      email: 'siobhan@among.local',
      emailLower: 'siobhan@among.local',
      passwordHash: hash2,
      avatarColor: 'bg-zinc-800 text-zinc-100',
      initials: 'SC',
      bio: 'Woodworker & tea enthusiast. In sanctuary mode.',
      presence: 'focus',
      statusMessage: 'In the studio till dusk',
      shareOnlineStatus: true,
      closeUserIds: [],
      createdAt: new Date().toISOString(),
    };

    db.users.push(seedUser1, seedUser2);
    modified = true;
  }

  if (modified || !fs.existsSync(DB_FILE)) {
    writeDb(db);
  }

  return db;
}

function writeDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function generateInitials(displayName: string): string {
  const clean = displayName.trim();
  if (!clean) return 'A';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRandomAvatarGradient(): string {
  const index = Math.floor(Math.random() * AVATAR_MONOCHROME_TONES.length);
  return AVATAR_MONOCHROME_TONES[index];
}

// User operations
export function findUserByPhoneNumber(phoneNumber: string): StoredUser | undefined {
  const db = ensureDbExists();
  const clean = phoneNumber.trim();
  return db.users.find((u) => u.phoneNumber === clean);
}

export function findUserByUsername(username: string): StoredUser | undefined {
  const db = ensureDbExists();
  const lower = username.trim().toLowerCase();
  return db.users.find((u) => u.usernameLower === lower);
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const db = ensureDbExists();
  const lower = email.trim().toLowerCase();
  return db.users.find((u) => u.emailLower === lower);
}

export function findUserById(id: string): StoredUser | undefined {
  const db = ensureDbExists();
  return db.users.find((u) => u.id === id);
}

export function findUserByIdentifier(identifier: string): StoredUser | undefined {
  const clean = identifier.trim().replace(/^@/, '');
  const lower = clean.toLowerCase();
  const db = ensureDbExists();
  return db.users.find(
    (u) =>
      u.usernameLower === lower ||
      u.emailLower === lower ||
      u.phoneNumber === identifier.trim()
  );
}

export function createOrLoginPhoneUser(
  phoneNumber: string,
  customId?: string,
  customDisplayName?: string
): { user: StoredUser; isNewUser: boolean } {
  const db = ensureDbExists();
  const cleanPhone = phoneNumber.trim();

  // 1. Check if user already exists with this phone number or customId
  const existingUser = db.users.find(
    (u) => u.phoneNumber === cleanPhone || (customId && u.id === customId)
  );
  if (existingUser) {
    return { user: existingUser, isNewUser: false };
  }

  // 2. Create new user for this verified phone number
  const id = customId || crypto.randomUUID();
  const avatarColor = getRandomAvatarGradient();
  
  // Friendly default display name (e.g. Member ...4567 or custom)
  const phoneSuffix = cleanPhone.replace(/\D/g, '').slice(-4) || '0000';
  const displayName = customDisplayName || `Member ···· ${phoneSuffix}`;
  const username = `member_${phoneSuffix}_${crypto.randomBytes(2).toString('hex')}`;
  const initials = 'AM';

  const newUser: StoredUser = {
    id,
    phoneNumber: cleanPhone,
    displayName,
    username,
    usernameLower: username.toLowerCase(),
    avatarColor,
    initials,
    bio: 'Seeking calm conversations in the sanctuary.',
    presence: 'quiet',
    statusMessage: 'Quietly present',
    shareOnlineStatus: true,
    closeUserIds: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);
  return { user: newUser, isNewUser: true };
}

// Phone verification code storage and rate limiting
export function storePhoneVerification(phoneNumber: string, codeHash?: string): StoredPhoneVerification {
  const db = ensureDbExists();
  const cleanPhone = phoneNumber.trim();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Remove any previous pending verification for this phone number
  db.phoneVerifications = db.phoneVerifications.filter((v) => v.phoneNumber !== cleanPhone);

  const verification: StoredPhoneVerification = {
    phoneNumber: cleanPhone,
    codeHash,
    attempts: 0,
    maxAttempts: 5,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    verified: false,
  };

  db.phoneVerifications.push(verification);
  writeDb(db);
  return verification;
}

export function getPhoneVerification(phoneNumber: string): StoredPhoneVerification | undefined {
  const db = ensureDbExists();
  const cleanPhone = phoneNumber.trim();
  return db.phoneVerifications.find((v) => v.phoneNumber === cleanPhone);
}

export function recordVerificationAttempt(phoneNumber: string): { allowed: boolean; remainingAttempts: number } {
  const db = ensureDbExists();
  const cleanPhone = phoneNumber.trim();
  const verification = db.phoneVerifications.find((v) => v.phoneNumber === cleanPhone);

  if (!verification) {
    return { allowed: false, remainingAttempts: 0 };
  }

  verification.attempts += 1;
  const remainingAttempts = Math.max(0, verification.maxAttempts - verification.attempts);
  const allowed = verification.attempts <= verification.maxAttempts;

  writeDb(db);
  return { allowed, remainingAttempts };
}

export function deletePhoneVerification(phoneNumber: string): void {
  const db = ensureDbExists();
  const cleanPhone = phoneNumber.trim();
  db.phoneVerifications = db.phoneVerifications.filter((v) => v.phoneNumber !== cleanPhone);
  writeDb(db);
}

export function createUser(params: {
  displayName: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  bio?: string;
}): StoredUser {
  const db = ensureDbExists();
  const id = crypto.randomUUID();
  const passwordHash = params.password ? hashPassword(params.password) : undefined;
  const initials = generateInitials(params.displayName);
  const avatarColor = getRandomAvatarGradient();
  const phoneNumber = params.phoneNumber?.trim() || `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

  const newUser: StoredUser = {
    id,
    phoneNumber,
    displayName: params.displayName.trim(),
    username: params.username.trim(),
    usernameLower: params.username.trim().toLowerCase(),
    email: params.email?.trim(),
    emailLower: params.email?.trim().toLowerCase(),
    passwordHash,
    avatarColor,
    initials,
    bio: (params.bio && params.bio.trim()) || 'Seeking calm conversations in the sanctuary.',
    presence: 'quiet',
    statusMessage: 'Quietly present',
    shareOnlineStatus: true,
    closeUserIds: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

export function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    bio?: string;
    statusMessage?: string;
    shareOnlineStatus?: boolean;
  }
): StoredUser | undefined {
  const db = ensureDbExists();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return undefined;

  if (typeof updates.displayName === 'string' && updates.displayName.trim()) {
    user.displayName = updates.displayName.trim();
    user.initials = generateInitials(user.displayName);
  }
  if (typeof updates.bio === 'string') {
    user.bio = updates.bio.trim();
  }
  if (typeof updates.statusMessage === 'string') {
    user.statusMessage = updates.statusMessage.trim();
  }
  if (typeof updates.shareOnlineStatus === 'boolean') {
    user.shareOnlineStatus = updates.shareOnlineStatus;
  }

  writeDb(db);
  return user;
}

export function updateUserPresence(
  userId: string,
  presence: StoredUser['presence'],
  statusMessage?: string
): StoredUser | undefined {
  const db = ensureDbExists();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return undefined;

  user.presence = presence;
  if (statusMessage !== undefined) {
    user.statusMessage = statusMessage;
  }
  writeDb(db);
  return user;
}

// Session operations
export function createSession(userId: string): StoredSession {
  const db = ensureDbExists();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session: StoredSession = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  db.sessions.push(session);
  writeDb(db);
  return session;
}

export function getSession(token: string): { session: StoredSession; user: StoredUser } | null {
  const db = ensureDbExists();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  // Check expiration
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    deleteSession(token);
    return null;
  }

  return { session, user };
}

export function deleteSession(token: string): void {
  const db = ensureDbExists();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeDb(db);
}

export function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    avatarColor: user.avatarColor,
    initials: user.initials,
    bio: user.bio || 'Seeking calm conversations in the sanctuary.',
    presence: user.presence,
    statusMessage: user.statusMessage,
    shareOnlineStatus: user.shareOnlineStatus ?? true,
    closeUserIds: user.closeUserIds || [],
    createdAt: user.createdAt,
  };
}

// -------------------------------------------------------------
// Blocking Security Logic
// -------------------------------------------------------------

export function isBlocked(userAId: string, userBId: string): boolean {
  const db = ensureDbExists();
  return db.blocks.some(
    (b) =>
      (b.blockerId === userAId && b.blockedId === userBId) ||
      (b.blockerId === userBId && b.blockedId === userAId)
  );
}

export function hasUserBlocked(blockerId: string, blockedId: string): boolean {
  const db = ensureDbExists();
  return db.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId);
}

export function blockUser(blockerId: string, blockedId: string): { success: boolean; error?: string } {
  if (blockerId === blockedId) {
    return { success: false, error: 'You cannot block yourself.' };
  }

  const db = ensureDbExists();
  const target = db.users.find((u) => u.id === blockedId);
  if (!target) {
    return { success: false, error: 'User not found.' };
  }

  // 1. Add block if not already present
  if (!db.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) {
    db.blocks.push({
      id: crypto.randomUUID(),
      blockerId,
      blockedId,
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Sever any active connection
  db.connections = db.connections.filter(
    (c) =>
      !(
        (c.user1Id === blockerId && c.user2Id === blockedId) ||
        (c.user1Id === blockedId && c.user2Id === blockerId)
      )
  );

  // 3. Cancel any pending connection requests
  const now = new Date().toISOString();
  for (const req of db.connectionRequests) {
    if (
      (req.senderId === blockerId && req.receiverId === blockedId) ||
      (req.senderId === blockedId && req.receiverId === blockerId)
    ) {
      if (req.status === 'pending') {
        req.status = 'cancelled';
        req.updatedAt = now;
      }
    }
  }

  // 4. Remove from each other's close lists
  const blocker = db.users.find((u) => u.id === blockerId);
  if (blocker && Array.isArray(blocker.closeUserIds)) {
    blocker.closeUserIds = blocker.closeUserIds.filter((id) => id !== blockedId);
  }
  if (target && Array.isArray(target.closeUserIds)) {
    target.closeUserIds = target.closeUserIds.filter((id) => id !== blockerId);
  }

  writeDb(db);
  return { success: true };
}

export function unblockUser(blockerId: string, blockedId: string): { success: boolean; error?: string } {
  const db = ensureDbExists();
  const index = db.blocks.findIndex((b) => b.blockerId === blockerId && b.blockedId === blockedId);
  if (index === -1) {
    return { success: false, error: 'User is not blocked.' };
  }

  db.blocks.splice(index, 1);
  writeDb(db);
  return { success: true };
}

export function getBlockedUsers(userId: string) {
  const db = ensureDbExists();
  const blockedIds = db.blocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId);
  return db.users
    .filter((u) => blockedIds.includes(u.id))
    .map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarColor: u.avatarColor,
      initials: u.initials,
      bio: u.bio,
    }));
}

// -------------------------------------------------------------
// People Search Logic
// -------------------------------------------------------------

export function searchUsers(currentUserId: string, rawQuery: string) {
  const db = ensureDbExists();
  const clean = rawQuery.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return [];

  const results: Array<{
    id: string;
    displayName: string;
    username: string;
    bio: string;
    avatarColor: string;
    initials: string;
    connectionStatus: 'connected' | 'outgoing_pending' | 'incoming_pending' | 'none';
    requestId?: string;
  }> = [];

  for (const user of db.users) {
    // 1. Exclude self
    if (user.id === currentUserId) continue;

    // 2. Exclude blocked users (either direction)
    if (isBlocked(currentUserId, user.id)) continue;

    // 3. Match @username or Display name
    const matchUsername = user.usernameLower.includes(clean);
    const matchDisplayName = user.displayName.toLowerCase().includes(clean);

    if (matchUsername || matchDisplayName) {
      // Determine relationship status
      const isConnected = db.connections.some(
        (c) =>
          (c.user1Id === currentUserId && c.user2Id === user.id) ||
          (c.user1Id === user.id && c.user2Id === currentUserId)
      );

      if (isConnected) {
        results.push({
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          bio: user.bio || 'Quiet member of the sanctuary.',
          avatarColor: user.avatarColor,
          initials: user.initials,
          connectionStatus: 'connected',
        });
        continue;
      }

      // Check outgoing request
      const outgoing = db.connectionRequests.find(
        (r) => r.senderId === currentUserId && r.receiverId === user.id && r.status === 'pending'
      );
      if (outgoing) {
        results.push({
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          bio: user.bio || 'Quiet member of the sanctuary.',
          avatarColor: user.avatarColor,
          initials: user.initials,
          connectionStatus: 'outgoing_pending',
          requestId: outgoing.id,
        });
        continue;
      }

      // Check incoming request
      const incoming = db.connectionRequests.find(
        (r) => r.senderId === user.id && r.receiverId === currentUserId && r.status === 'pending'
      );
      if (incoming) {
        results.push({
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          bio: user.bio || 'Quiet member of the sanctuary.',
          avatarColor: user.avatarColor,
          initials: user.initials,
          connectionStatus: 'incoming_pending',
          requestId: incoming.id,
        });
        continue;
      }

      // None
      results.push({
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        bio: user.bio || 'Quiet member of the sanctuary.',
        avatarColor: user.avatarColor,
        initials: user.initials,
        connectionStatus: 'none',
      });
    }
  }

  return results;
}

// -------------------------------------------------------------
// Connection Requests & Connections
// -------------------------------------------------------------

export function sendConnectionRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    return { success: false, error: 'You cannot connect with yourself.' };
  }

  const db = ensureDbExists();
  const receiver = db.users.find((u) => u.id === receiverId);
  if (!receiver) {
    return { success: false, error: 'User not found.' };
  }

  // Security: check blocking
  if (isBlocked(senderId, receiverId)) {
    return { success: false, error: 'Unable to connect with this user.' };
  }

  // Security: check if already connected
  const alreadyConnected = db.connections.some(
    (c) =>
      (c.user1Id === senderId && c.user2Id === receiverId) ||
      (c.user1Id === receiverId && c.user2Id === senderId)
  );
  if (alreadyConnected) {
    return { success: false, error: 'You are already connected with this person.' };
  }

  // Check if duplicate pending request from sender
  const existingPending = db.connectionRequests.find(
    (r) => r.senderId === senderId && r.receiverId === receiverId && r.status === 'pending'
  );
  if (existingPending) {
    return { success: false, error: 'A connection request is already pending.' };
  }

  // Check if target user already sent a pending request to sender -> auto-accept
  const crossPending = db.connectionRequests.find(
    (r) => r.senderId === receiverId && r.receiverId === senderId && r.status === 'pending'
  );
  if (crossPending) {
    crossPending.status = 'accepted';
    crossPending.updatedAt = new Date().toISOString();
    db.connections.push({
      id: crypto.randomUUID(),
      user1Id: senderId,
      user2Id: receiverId,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    return { success: true, autoAccepted: true, message: 'Mutual connection confirmed.' };
  }

  // Create new request
  const newRequest: StoredConnectionRequest = {
    id: crypto.randomUUID(),
    senderId,
    receiverId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.connectionRequests.push(newRequest);
  writeDb(db);
  return { success: true, request: newRequest };
}

export function acceptConnectionRequest(userId: string, requestId: string) {
  const db = ensureDbExists();
  const request = db.connectionRequests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Connection request not found.' };
  }

  // Security: Only the intended receiver can accept
  if (request.receiverId !== userId) {
    return { success: false, error: 'Unauthorized to accept this request.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request is already ${request.status}.` };
  }

  // Security: check blocking
  if (isBlocked(request.senderId, request.receiverId)) {
    return { success: false, error: 'Cannot connect with a blocked user.' };
  }

  request.status = 'accepted';
  request.updatedAt = new Date().toISOString();

  // Create connection if not exists
  const alreadyConnected = db.connections.some(
    (c) =>
      (c.user1Id === request.senderId && c.user2Id === request.receiverId) ||
      (c.user1Id === request.receiverId && c.user2Id === request.senderId)
  );

  if (!alreadyConnected) {
    db.connections.push({
      id: crypto.randomUUID(),
      user1Id: request.senderId,
      user2Id: request.receiverId,
      createdAt: new Date().toISOString(),
    });
  }

  writeDb(db);
  return { success: true };
}

export function declineConnectionRequest(userId: string, requestId: string) {
  const db = ensureDbExists();
  const request = db.connectionRequests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Connection request not found.' };
  }

  // Security: Only the intended receiver can decline
  if (request.receiverId !== userId) {
    return { success: false, error: 'Unauthorized to decline this request.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request is already ${request.status}.` };
  }

  request.status = 'declined';
  request.updatedAt = new Date().toISOString();
  writeDb(db);
  return { success: true };
}

export function cancelConnectionRequest(userId: string, requestId: string) {
  const db = ensureDbExists();
  const request = db.connectionRequests.find((r) => r.id === requestId);
  if (!request) {
    return { success: false, error: 'Connection request not found.' };
  }

  // Security: Only the sender can cancel
  if (request.senderId !== userId) {
    return { success: false, error: 'Unauthorized to cancel this request.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request is already ${request.status}.` };
  }

  request.status = 'cancelled';
  request.updatedAt = new Date().toISOString();
  writeDb(db);
  return { success: true };
}

export function getConnectionRequests(userId: string) {
  const db = ensureDbExists();

  // Incoming pending requests
  const incoming = db.connectionRequests
    .filter((r) => r.receiverId === userId && r.status === 'pending')
    .filter((r) => !isBlocked(r.senderId, userId))
    .map((r) => {
      const sender = db.users.find((u) => u.id === r.senderId);
      return {
        id: r.id,
        sender: sender
          ? {
              id: sender.id,
              displayName: sender.displayName,
              username: sender.username,
              avatarColor: sender.avatarColor,
              initials: sender.initials,
              bio: sender.bio || 'Quiet member of the sanctuary.',
            }
          : null,
        createdAt: r.createdAt,
      };
    })
    .filter((item) => item.sender !== null);

  // Outgoing pending requests
  const outgoing = db.connectionRequests
    .filter((r) => r.senderId === userId && r.status === 'pending')
    .filter((r) => !isBlocked(userId, r.receiverId))
    .map((r) => {
      const receiver = db.users.find((u) => u.id === r.receiverId);
      return {
        id: r.id,
        receiver: receiver
          ? {
              id: receiver.id,
              displayName: receiver.displayName,
              username: receiver.username,
              avatarColor: receiver.avatarColor,
              initials: receiver.initials,
              bio: receiver.bio || 'Quiet member of the sanctuary.',
            }
          : null,
        createdAt: r.createdAt,
      };
    })
    .filter((item) => item.receiver !== null);

  return { incoming, outgoing };
}

export function getConnections(userId: string) {
  const db = ensureDbExists();
  const currentUser = db.users.find((u) => u.id === userId);
  const closeIds = currentUser?.closeUserIds || [];

  const userConnections = db.connections.filter(
    (c) => c.user1Id === userId || c.user2Id === userId
  );

  const people: Array<{
    id: string;
    displayName: string;
    username: string;
    avatarColor: string;
    initials: string;
    bio: string;
    statusMessage: string;
    isClose: boolean;
    onlineStatus: StoredUser['presence'] | 'offline';
    presence: StoredUser['presence'];
    shareOnlineStatus: boolean;
    connectedAt: string;
  }> = [];

  for (const conn of userConnections) {
    const otherId = conn.user1Id === userId ? conn.user2Id : conn.user1Id;
    if (isBlocked(userId, otherId)) continue;

    const otherUser = db.users.find((u) => u.id === otherId);
    if (!otherUser) continue;

    // Respect privacy settings: online status shown only when permitted
    const shareOnline = otherUser.shareOnlineStatus ?? true;
    const onlineStatus = shareOnline ? otherUser.presence : 'offline';

    people.push({
      id: otherUser.id,
      displayName: otherUser.displayName,
      username: otherUser.username,
      avatarColor: otherUser.avatarColor,
      initials: otherUser.initials,
      bio: otherUser.bio || 'Quiet member of the sanctuary.',
      statusMessage: otherUser.statusMessage,
      isClose: closeIds.includes(otherUser.id),
      onlineStatus,
      presence: otherUser.presence,
      shareOnlineStatus: shareOnline,
      connectedAt: conn.createdAt,
    });
  }

  return people;
}

export function toggleCloseConnection(userId: string, targetUserId: string) {
  const db = ensureDbExists();
  const currentUser = db.users.find((u) => u.id === userId);
  if (!currentUser) return { success: false, error: 'User not found.' };

  // Verify they are actually connected
  const isConnected = db.connections.some(
    (c) =>
      (c.user1Id === userId && c.user2Id === targetUserId) ||
      (c.user1Id === targetUserId && c.user2Id === userId)
  );
  if (!isConnected) {
    return { success: false, error: 'User must be connected to mark as Close.' };
  }

  if (!Array.isArray(currentUser.closeUserIds)) {
    currentUser.closeUserIds = [];
  }

  const index = currentUser.closeUserIds.indexOf(targetUserId);
  let isClose: boolean;
  if (index >= 0) {
    currentUser.closeUserIds.splice(index, 1);
    isClose = false;
  } else {
    currentUser.closeUserIds.push(targetUserId);
    isClose = true;
  }

  writeDb(db);
  return { success: true, isClose };
}

export function removeConnection(userId: string, targetUserId: string) {
  const db = ensureDbExists();
  const currentUser = db.users.find((u) => u.id === userId);
  const targetUser = db.users.find((u) => u.id === targetUserId);

  db.connections = db.connections.filter(
    (c) =>
      !(
        (c.user1Id === userId && c.user2Id === targetUserId) ||
        (c.user1Id === targetUserId && c.user2Id === userId)
      )
  );

  if (currentUser && Array.isArray(currentUser.closeUserIds)) {
    currentUser.closeUserIds = currentUser.closeUserIds.filter((id) => id !== targetUserId);
  }
  if (targetUser && Array.isArray(targetUser.closeUserIds)) {
    targetUser.closeUserIds = targetUser.closeUserIds.filter((id) => id !== userId);
  }

  writeDb(db);
  return { success: true };
}

// -------------------------------------------------------------
// End-to-End Encryption Public Key Registry
// -------------------------------------------------------------

export function publishPublicKeyBundle(bundle: StoredPublicKeyBundle) {
  const db = ensureDbExists();
  const existingIdx = db.publicKeyBundles.findIndex((b) => b.userId === bundle.userId);
  if (existingIdx >= 0) {
    db.publicKeyBundles[existingIdx] = {
      ...bundle,
      updatedAt: new Date().toISOString(),
    };
  } else {
    db.publicKeyBundles.push({
      ...bundle,
      updatedAt: new Date().toISOString(),
    });
  }
  writeDb(db);
  return { success: true, fingerprint: bundle.fingerprint };
}

export function getPublicKeyBundle(userId: string): StoredPublicKeyBundle | null {
  const db = ensureDbExists();
  return db.publicKeyBundles.find((b) => b.userId === userId) || null;
}

// -------------------------------------------------------------
// Zero-Knowledge Encrypted Message Mailbox & Ordering
// -------------------------------------------------------------

export function getNextChatSequence(chatId: string): number {
  const db = ensureDbExists();
  if (!db.chatSequences[chatId]) {
    db.chatSequences[chatId] = 0;
  }
  db.chatSequences[chatId] += 1;
  writeDb(db);
  return db.chatSequences[chatId];
}

export function storeEncryptedMessage(msg: StoredEncryptedMessage): { success: boolean; sequenceNumber: number } {
  const db = ensureDbExists();
  
  // Assign monotonic sequence number if not already strictly set
  let seq = msg.sequenceNumber;
  if (!seq || seq <= 0) {
    seq = getNextChatSequence(msg.chatId);
  } else {
    if (!db.chatSequences[msg.chatId] || seq > db.chatSequences[msg.chatId]) {
      db.chatSequences[msg.chatId] = seq;
    }
  }

  const normalized: StoredEncryptedMessage = {
    ...msg,
    sequenceNumber: seq,
    status: msg.status || 'sent',
    createdAt: msg.createdAt || new Date().toISOString(),
  };

  // Idempotent insertion: do not store duplicate message IDs
  const existingIdx = db.encryptedMessages.findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    db.encryptedMessages[existingIdx] = normalized;
  } else {
    db.encryptedMessages.push(normalized);
  }

  // Cap mailbox size safely to prevent uncontrolled disk growth
  if (db.encryptedMessages.length > 5000) {
    db.encryptedMessages = db.encryptedMessages.slice(-5000);
  }

  writeDb(db);
  return { success: true, sequenceNumber: seq };
}

export function getPendingMessagesForRecipient(recipientId: string, sinceTimestamp: number = 0): StoredEncryptedMessage[] {
  const db = ensureDbExists();
  return db.encryptedMessages.filter((m) => {
    if (m.recipientId !== recipientId) return false;
    const msgTime = new Date(m.createdAt).getTime();
    return msgTime >= sinceTimestamp || m.status !== 'read';
  });
}

export function getMessagesForChat(chatId: string, limit: number = 100): StoredEncryptedMessage[] {
  const db = ensureDbExists();
  const chatMsgs = db.encryptedMessages.filter((m) => m.chatId === chatId);
  chatMsgs.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  return chatMsgs.slice(-limit);
}

export function updateEncryptedMessageStatus(
  messageId: string,
  status: 'delivered' | 'read',
  timestamp: string = new Date().toISOString()
): boolean {
  const db = ensureDbExists();
  const msg = db.encryptedMessages.find((m) => m.id === messageId);
  if (!msg) return false;

  if (status === 'delivered') {
    if (msg.status === 'sent') {
      msg.status = 'delivered';
      msg.deliveredAt = timestamp;
      writeDb(db);
      return true;
    }
  } else if (status === 'read') {
    msg.status = 'read';
    msg.readAt = timestamp;
    if (!msg.deliveredAt) msg.deliveredAt = timestamp;
    writeDb(db);
    return true;
  }
  return false;
}
