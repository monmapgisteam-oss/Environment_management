// Runs callbacks for the same key one after another in this process. Attempt
// limits read a counter, check a secret, then write the counter; without this,
// parallel requests could all read the same count and each get a guess.
// One backend instance runs per deployment (docker-compose.yml); with several,
// the counter itself would need to be atomic.
const tails = new Map<string, Promise<void>>();

export async function withKeyLock<T>(key: string, callback: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  tails.set(key, tail);
  try {
    await previous;
    return await callback();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}
