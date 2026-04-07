import { authenticatedFetch } from './api';

const SYNC_QUEUE_KEY = 'fp_sync_queue';

/**
 * Saves a workout to the local sync queue if the user is offline 
 * or the request fails due to a network error.
 */
export const saveToSyncQueue = (workout) => {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  queue.push({
    ...workout,
    id_local: `sync_${Date.now()}_${Math.random()}`,
    queued_at: new Date().toISOString()
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

/**
 * Processes the queue and tries to send each workout to the server.
 */
export const processSyncQueue = async () => {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  if (queue.length === 0) return { success: true, count: 0 };

  const remainingQueue = [];
  let successfulCount = 0;
  let hasError = false;

  for (const workout of queue) {
    if (hasError) {
      // If one fails, don't try others to preserve order
      remainingQueue.push(workout);
      continue;
    }

    try {
      // Distinguish between update and create
      // For new workouts in queue, we always POST
      const res = await authenticatedFetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workout)
      });

      if (res.ok) {
        successfulCount++;
      } else {
        remainingQueue.push(workout);
        hasError = true;
      }
    } catch (e) {
      remainingQueue.push(workout);
      hasError = true;
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
  return { success: !hasError, count: successfulCount, remaining: remainingQueue.length };
};

export const getSyncQueueCount = () => {
  const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  return queue.length;
};
