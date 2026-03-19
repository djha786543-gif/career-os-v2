import { fetchAllMonitorJobs } from './src/services/adzunaFetcher';

async function main() {
  console.log('🚀 Starting manual job fetch for all monitor organizations...');
  try {
    await fetchAllMonitorJobs();
    console.log('✅ Fetch complete! Refresh your browser now.');
  } catch (error) {
    console.error('❌ Fetch failed:', error);
  }
}

main();