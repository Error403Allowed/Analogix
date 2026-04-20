import { cleanupCorruptedSnapshots } from './lib/ydoc-persistence';

async function main() {
  console.log('Starting bulk cleanup of corrupted Yjs snapshots...');
  const result = await cleanupCorruptedSnapshots();
  console.log(`Cleaned ${result.cleaned} corrupted documents`);
}

main().catch(console.error);