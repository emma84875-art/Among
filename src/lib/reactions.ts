import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export interface ReactionRecord {
  [emoji: string]: string[]; // Map of emoji -> array of user IDs
}

export const POPULAR_REACTION_EMOJIS = ['❤️', '👍', '✨', '😂', '😮', '😢', '🙏', '🔥', '👏'];

export const EXTENDED_REACTION_EMOJIS = [
  '❤️', '👍', '✨', '😂', '😮', '😢', '🙏', '🔥', '👏',
  '🤍', '🌿', '🕊️', '🧘', '☕', '🌸', '💫', '🙌', '💯', '🌙',
  '💡', '🎉', '🫶', '🤗', '🥑', '🕯️', '🧸', '🌈', '🫂', '🕊️'
];

/**
 * Generates a deterministic document ID for a user's emoji reaction on a message
 */
export function getReactionDocId(userId: string, emoji: string): string {
  // Use a clean base64/hex safe token for emoji characters in path
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)?.toString(16) || '')
    .join('_');
  return `${userId}_${codePoints}`;
}

/**
 * Toggle an emoji reaction for a user on a given message in Firestore.
 * Handles both the aggregated reactions map on the message doc and the reactions subcollection.
 */
export async function toggleMessageReactionInFirestore(
  chatId: string,
  messageId: string,
  emoji: string,
  userId?: string,
  currentReactions: ReactionRecord = {}
): Promise<{ updatedReactions: ReactionRecord; added: boolean }> {
  const currentUid = auth.currentUser?.uid || userId || 'you';
  const updatedReactions: ReactionRecord = { ...currentReactions };

  const existingUsers = updatedReactions[emoji] ? [...updatedReactions[emoji]] : [];
  const hasReacted = existingUsers.includes(currentUid);
  let added = false;

  if (hasReacted) {
    // Remove reaction
    const filtered = existingUsers.filter((u) => u !== currentUid);
    if (filtered.length > 0) {
      updatedReactions[emoji] = filtered;
    } else {
      delete updatedReactions[emoji];
    }
    added = false;
  } else {
    // Add reaction
    updatedReactions[emoji] = [...existingUsers, currentUid];
    added = true;
  }

  const messageDocPath = `chats/${chatId}/messages/${messageId}`;
  const reactionDocId = getReactionDocId(currentUid, emoji);
  const reactionDocPath = `chats/${chatId}/messages/${messageId}/reactions/${reactionDocId}`;

  // Persist to Firestore only if an authenticated Firebase session exists with a valid UID
  if (auth.currentUser && auth.currentUser.uid && currentUid === auth.currentUser.uid) {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await setDoc(
        messageRef,
        {
          id: messageId,
          chatId,
          reactions: updatedReactions,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const reactionRef = doc(db, 'chats', chatId, 'messages', messageId, 'reactions', reactionDocId);
      if (added) {
        await setDoc(reactionRef, {
          id: reactionDocId,
          chatId,
          messageId,
          userId: currentUid,
          emoji,
          createdAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(reactionRef);
      }
    } catch (error) {
      console.warn('Reaction Firestore sync notice (persisting locally):', error);
    }
  }

  return { updatedReactions, added };
}

/**
 * Subscribe to real-time reactions on a chat's message in Firestore
 */
export function subscribeToMessageReactions(
  chatId: string,
  messageId: string,
  onReactionsUpdated: (reactions: ReactionRecord) => void
): () => void {
  if (!auth.currentUser || !auth.currentUser.uid) {
    return () => {};
  }
  const messageDocPath = `chats/${chatId}/messages/${messageId}`;
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

  return onSnapshot(
    messageRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.reactions) {
          onReactionsUpdated(data.reactions as ReactionRecord);
        }
      }
    },
    (error) => {
      console.warn('Message reactions subscription notice:', error);
    }
  );
}
