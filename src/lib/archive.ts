/**
 * Archive Management for Sanctuary (Among)
 *
 * Keeps conversations tucked away out of the main active circle
 * without deleting them or compromising their cryptographic integrity.
 */

export const ARCHIVE_STORAGE_KEY = 'among_archived_threads_v1';
export const ARCHIVE_CHANGED_EVENT = 'among_archive_changed';

export interface ArchivedMeta {
  threadId: string;
  archivedAt: string; // ISO date string or formatted timestamp
}

export type ArchivedRecord = Record<string, ArchivedMeta>;

const DEFAULT_ARCHIVED_IDS: string[] = ['chat-5']; // Marcus Bell's older conversation tucked away by default

export function getArchivedRecord(): ArchivedRecord {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!raw) {
      // First run: initialize with default archived conversation
      const initial: ArchivedRecord = {};
      DEFAULT_ARCHIVED_IDS.forEach((id) => {
        initial[id] = {
          threadId: id,
          archivedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        };
      });
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as ArchivedRecord;
  } catch {
    return {};
  }
}

export function saveArchivedRecord(record: ArchivedRecord): void {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent(ARCHIVE_CHANGED_EVENT, { detail: record }));
  } catch (err) {
    console.error('Failed to save archive record:', err);
  }
}

export function isThreadArchived(threadId: string): boolean {
  const record = getArchivedRecord();
  return Boolean(record[threadId]);
}

export function archiveThread(threadId: string): void {
  const record = getArchivedRecord();
  record[threadId] = {
    threadId,
    archivedAt: new Date().toISOString(),
  };
  saveArchivedRecord(record);
}

export function unarchiveThread(threadId: string): void {
  const record = getArchivedRecord();
  if (record[threadId]) {
    delete record[threadId];
    saveArchivedRecord(record);
  }
}

export function toggleThreadArchive(threadId: string): boolean {
  const record = getArchivedRecord();
  if (record[threadId]) {
    delete record[threadId];
    saveArchivedRecord(record);
    return false;
  } else {
    record[threadId] = {
      threadId,
      archivedAt: new Date().toISOString(),
    };
    saveArchivedRecord(record);
    return true;
  }
}

export function unarchiveAllThreads(): void {
  saveArchivedRecord({});
}
