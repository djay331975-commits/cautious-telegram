import IORedis from 'ioredis';
// @ts-ignore
import RedisMock from 'ioredis-mock';

export const getRedisConnection = () => {
  if (process.env.REDIS_URL === 'mock') {
    console.log('Using mock Redis connection');
    return new RedisMock();
  }
  
  return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
};
