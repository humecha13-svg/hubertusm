import youtubeDl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../logger';

export class VideoDownloader {
  private tempDir: string;

  constructor() {
    this.tempDir = config.video.tempDir;
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error);
    }
  }

  async downloadVideo(videoUrl: string, videoId: string): Promise<string> {
    try {
      logger.info(`Downloading video: ${videoId}`);

      const outputPath = path.join(this.tempDir, `${videoId}.mp4`);

      // Check if already downloaded
      try {
        await fs.access(outputPath);
        logger.info(`Video already downloaded: ${outputPath}`);
        return outputPath;
      } catch {
        // File doesn't exist, proceed with download
      }

      await youtubeDl(videoUrl, {
        output: outputPath,
        format: 'best[ext=mp4]',
        quiet: false,
        noWarnings: true,
      });

      logger.info(`Video downloaded successfully: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error(`Failed to download video ${videoId}`, error);
      throw error;
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
      logger.info('Cleaned up temp files');
    } catch (error) {
      logger.error('Failed to cleanup temp files', error);
    }
  }
}
