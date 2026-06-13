import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  youtube: {
    apiKey: string;
    channelId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  video: {
    tempDir: string;
    outputDir: string;
    maxConcurrentJobs: number;
  };
  highlights: {
    minDuration: number;
    maxDuration: number;
    sensitivity: number;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    channelId: process.env.YOUTUBE_CHANNEL_ID || '',
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
  },
  video: {
    tempDir: process.env.VIDEO_TEMP_DIR || './temp',
    outputDir: process.env.VIDEO_OUTPUT_DIR || './output',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '2'),
  },
  highlights: {
    minDuration: parseInt(process.env.MIN_HIGHLIGHT_DURATION || '15'),
    maxDuration: parseInt(process.env.MAX_HIGHLIGHT_DURATION || '60'),
    sensitivity: parseFloat(process.env.HIGHLIGHT_SENSITIVITY || '0.7'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.youtube.apiKey) errors.push('YOUTUBE_API_KEY is required');
  if (!config.openai.apiKey) errors.push('OPENAI_API_KEY is required');

  return errors;
}
