import { YouTubeService } from './youtube';
import { VideoDownloader } from './downloader';
import { AIAnalyzer } from './ai-analyzer';
import { VideoProcessor } from './video-processor';
import { logger } from '../logger';
import { ProcessingJob } from '../types';

export class ShortsOrchestrator {
  private youtubeService: YouTubeService;
  private downloader: VideoDownloader;
  private analyzer: AIAnalyzer;
  private processor: VideoProcessor;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.downloader = new VideoDownloader();
    this.analyzer = new AIAnalyzer();
    this.processor = new VideoProcessor();
  }

  async processVideo(videoUrl: string, videoId: string): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: `job-${Date.now()}`,
      videoId,
      videoUrl,
      status: 'pending',
      highlights: [],
      createdShorts: [],
      progress: 0,
    };

    try {
      // Step 1: Download
      job.status = 'downloading';
      job.progress = 10;
      logger.info(`[Job ${job.id}] Downloading video...`);

      const videoPath = await this.downloader.downloadVideo(videoUrl, videoId);
      job.progress = 30;

      // Step 2: Analyze with AI
      job.status = 'analyzing';
      job.progress = 40;
      logger.info(`[Job ${job.id}] Analyzing highlights with AI...`);

      const highlights = await this.analyzer.detectHighlights(videoPath);
      job.highlights = highlights;
      job.progress = 60;

      if (highlights.length === 0) {
        logger.warn(`[Job ${job.id}] No highlights detected`);
        job.status = 'completed';
        return job;
      }

      // Step 3: Process highlights into shorts
      job.status = 'processing';
      job.progress = 70;
      logger.info(`[Job ${job.id}] Processing highlights into shorts...`);

      const shorts = await this.processor.processHighlights(
        videoPath,
        highlights,
        videoId
      );

      job.createdShorts = shorts.map((s) => s.filePath);
      job.progress = 90;

      // Step 4: Upload (if credentials available)
      job.status = 'uploading';
      logger.info(`[Job ${job.id}] Uploading shorts...`);

      for (const short of shorts) {
        const uploadId = await this.youtubeService.uploadShort(
          short.filePath,
          short.title,
          short.description,
          short.tags
        );

        if (uploadId) {
          logger.info(`[Job ${job.id}] Uploaded short: ${uploadId}`);
        }
      }

      job.status = 'completed';
      job.progress = 100;

      logger.info(`[Job ${job.id}] Processing completed successfully`);
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Job ${job.id}] Processing failed`, error);
      return job;
    }
  }

  async searchAndProcess(searchLimit: number = 5): Promise<ProcessingJob[]> {
    try {
      logger.info('Searching for World Cup matches...');

      const videos = await this.youtubeService.searchWorldCupMatches(searchLimit);

      if (!videos.length) {
        logger.warn('No videos found');
        return [];
      }

      const jobs: ProcessingJob[] = [];

      for (const video of videos) {
        logger.info(`Processing: ${video.title}`);
        const job = await this.processVideo(video.url, video.id);
        jobs.push(job);
      }

      return jobs;
    } catch (error) {
      logger.error('Search and process failed', error);
      throw error;
    }
  }
}
