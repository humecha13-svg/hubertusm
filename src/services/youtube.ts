import axios from 'axios';
import { config } from '../config';
import { logger } from '../logger';
import { VideoMetadata } from '../types';

export class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = config.youtube.apiKey;
  }

  async searchWorldCupMatches(limit: number = 10): Promise<VideoMetadata[]> {
    try {
      logger.info(`Searching for World Cup matches...`);

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: 'world cup football highlights',
          type: 'video',
          order: 'relevance',
          maxResults: limit,
          relevanceLanguage: 'en',
        },
      });

      const videos: VideoMetadata[] = [];

      for (const item of response.data.items) {
        const videoId = item.id.videoId;
        const details = await this.getVideoDetails(videoId);
        if (details) {
          videos.push(details);
        }
      }

      logger.info(`Found ${videos.length} World Cup matches`);
      return videos;
    } catch (error) {
      logger.error('Failed to search World Cup matches', error);
      throw error;
    }
  }

  async getVideoDetails(videoId: string): Promise<VideoMetadata | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoId,
          part: 'snippet,contentDetails,statistics',
        },
      });

      if (!response.data.items.length) return null;

      const item = response.data.items[0];
      const snippet = item.snippet;
      const contentDetails = item.contentDetails;

      const duration = this.parseISO8601Duration(contentDetails.duration);

      return {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        duration: duration,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
      };
    } catch (error) {
      logger.error(`Failed to get video details for ${videoId}`, error);
      return null;
    }
  }

  private parseISO8601Duration(duration: string): number {
    const regex = /PT(\d+H)?(\d+M)?(\d+S)?/;
    const matches = duration.match(regex);

    let totalSeconds = 0;
    if (matches) {
      if (matches[1]) totalSeconds += parseInt(matches[1]) * 3600;
      if (matches[2]) totalSeconds += parseInt(matches[2]) * 60;
      if (matches[3]) totalSeconds += parseInt(matches[3]);
    }

    return totalSeconds;
  }

  async uploadShort(
    filePath: string,
    title: string,
    description: string,
    tags: string[]
  ): Promise<string | null> {
    try {
      logger.info(`Uploading short: ${title}`);
      // TODO: Implement YouTube upload with OAuth2
      logger.warn('YouTube upload not yet implemented');
      return null;
    } catch (error) {
      logger.error('Failed to upload short', error);
      return null;
    }
  }
}
