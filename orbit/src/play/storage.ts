import { validateSnapshot, type PlaySnapshot } from './model';
export type Papers = { current: PlaySnapshot; previous: PlaySnapshot | null };
// One bounded record of vector data; never an accumulating bitmap archive.
export class PaperStore {
  private connection?: Promise<IDBDatabase>;
  private queue: Promise<void> = Promise.resolve();
  private db(): Promise<IDBDatabase> {
    return this.connection ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('orbit.play', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('papers');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Paper storage blocked'));
    });
  }
  async read(): Promise<Papers | undefined> {
    const db = await this.db();
    const value = await new Promise<Papers | undefined>((resolve, reject) => {
      const request = db.transaction('papers').objectStore('papers').get('session');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    if (value) { validateSnapshot(value.current); if (value.previous) validateSnapshot(value.previous); }
    return value;
  }
  write(value: Papers): Promise<void> {
    const copy = structuredClone(value);
    const task = this.queue.catch(() => {}).then(async () => {
      validateSnapshot(copy.current); if (copy.previous) validateSnapshot(copy.previous);
      if (JSON.stringify(copy).length > 4_000_000) throw new Error('Paper storage limit');
      const db = await this.db();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('papers', 'readwrite');
        transaction.objectStore('papers').put(copy, 'session');
        transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
      });
    });
    this.queue = task; return task;
  }
}
