import { config, validateConfig } from './config';
import { logger } from './logger';
import { ShortsOrchestrator } from './services/orchestrator';

async function main() {
  try {
    logger.info('YouTube Shorts Generator Starting...');

    // Validate configuration
    const errors = validateConfig();
    if (errors.length > 0) {
      logger.error('Configuration errors:');
      errors.forEach((error) => logger.error(`  - ${error}`));
      logger.error('Please set up your .env file with required variables');
      process.exit(1);
    }

    const orchestrator = new ShortsOrchestrator();

    // Get command from CLI arguments
    const command = process.argv[2] || 'search';
    const arg = process.argv[3];

    switch (command) {
      case 'search':
        {
          const limit = parseInt(arg) || 5;
          logger.info(`Searching for ${limit} World Cup videos...`);
          const jobs = await orchestrator.searchAndProcess(limit);

          logger.info('Processing Results:');
          jobs.forEach((job) => {
            logger.info(`  Job ${job.id}: ${job.status}`);
            logger.info(`    - Highlights found: ${job.highlights.length}`);
            logger.info(`    - Shorts created: ${job.createdShorts.length}`);
            if (job.error) {
              logger.error(`    - Error: ${job.error}`);
            }
          });
        }
        break;

      case 'process':
        {
          if (!arg) {
            logger.error('Please provide a YouTube URL');
            logger.info('Usage: npm start process <youtube-url>');
            process.exit(1);
          }

          const videoUrl = arg;
          const videoId = this.extractVideoId(videoUrl) || 'unknown';

          logger.info(`Processing video: ${videoUrl}`);
          const job = await orchestrator.processVideo(videoUrl, videoId);

          logger.info('Processing Result:');
          logger.info(`  Status: ${job.status}`);
          logger.info(`  Highlights found: ${job.highlights.length}`);
          logger.info(`  Shorts created: ${job.createdShorts.length}`);
          if (job.error) {
            logger.error(`  Error: ${job.error}`);
          }
        }
        break;

      default:
        logger.info('Available commands:');
        logger.info('  npm start search [limit]  - Search and process World Cup videos');
        logger.info('  npm start process <url>   - Process a specific YouTube video');
        break;
    }
  } catch (error) {
    logger.error('Fatal error', error);
    process.exit(1);
  }
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

main();
