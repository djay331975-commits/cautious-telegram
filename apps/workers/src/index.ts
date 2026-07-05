import 'dotenv/config';
import { discoveryWorker } from './workers/discovery';
import { listingWorker } from './workers/listing';
import { fulfillmentWorker } from './workers/fulfillment';

console.log('Automation workers starting up...');

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await discoveryWorker.close();
  await listingWorker.close();
  await fulfillmentWorker.close();
  process.exit(0);
});

console.log('Workers are running and listening for jobs.');
