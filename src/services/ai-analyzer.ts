import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../logger';
import { Highlight } from '../types';
import ffmpeg from 'fluent-ffmpeg';

export class AIAnalyzer {
  private openai: OpenAI;
  private sensitivity: number;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.sensitivity = config.highlights.sensitivity;
  }

  async extractFrames(
    videoPath: string,
    intervalSeconds: number = 5
  ): Promise<{ timestamp: number; frame: Buffer }[]> {
    return new Promise((resolve, reject) => {
      const frames: { timestamp: number; frame: Buffer }[] = [];
      let processedCount = 0;

      ffmpeg(videoPath)
        .screenshots({
          count: Math.ceil(this.getVideoDuration(videoPath) / intervalSeconds),
          folder: config.video.tempDir,
          filename: 'frame-%04d.png',
        })
        .on('end', async () => {
          logger.info(`Extracted frames from video`);
          resolve(frames);
        })
        .on('error', (err) => {
          logger.error('Failed to extract frames', err);
          reject(err);
        });
    });
  }

  async detectHighlights(videoPath: string): Promise<Highlight[]> {
    try {
      logger.info('Starting AI highlight detection...');

      const highlights: Highlight[] = [];

      // Sample frames at intervals (every 10 seconds)
      const frameInterval = 10;
      const estimatedDuration = await this.getVideoDuration(videoPath);
      const samplePoints = Math.ceil(estimatedDuration / frameInterval);

      logger.info(`Analyzing ${samplePoints} sample points from video`);

      // For each sample point, analyze if it's a highlight
      for (let i = 0; i < samplePoints; i++) {
        const timestamp = i * frameInterval;

        const isHighlight = await this.analyzeTimestamp(
          videoPath,
          timestamp,
          `Sample ${i + 1}/${samplePoints}`
        );

        if (isHighlight.score > this.sensitivity) {
          // Find continuous highlight region
          const highlight = await this.expandHighlightRegion(
            videoPath,
            timestamp,
            isHighlight
          );

          // Avoid overlapping highlights
          if (!this.overlapsWithExisting(highlight, highlights)) {
            highlights.push(highlight);
          }
        }
      }

      // Sort by score
      highlights.sort((a, b) => b.score - a.score);

      logger.info(`Detected ${highlights.length} highlights`);
      return highlights;
    } catch (error) {
      logger.error('Failed to detect highlights', error);
      throw error;
    }
  }

  private async analyzeTimestamp(
    videoPath: string,
    timestamp: number,
    label: string
  ): Promise<{ score: number; type: Highlight['type']; description: string }> {
    try {
      logger.debug(`Analyzing timestamp ${timestamp}s (${label})`);

      // Create detailed prompt for highlight detection
      const prompt = `Analyze this sports video screenshot and score how "exciting" or "important" this moment is.

Consider:
- Goalscoring moments or near-misses
- Dramatic saves or defensive plays
- Player celebrations
- Intense action sequences
- Controversial referee decisions
- Turning points in the match

Respond with a JSON object:
{
  "score": 0.0 to 1.0 (how exciting this moment is),
  "type": "goal" | "save" | "foul" | "celebration" | "dramatic_moment" | "action",
  "description": "brief description of what's happening"
}`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'text',
                text: `Video timestamp: ${this.formatTime(timestamp)}`,
              },
            ],
          },
        ],
        max_tokens: 200,
      });

      const content = response.choices[0].message.content || '{}';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        score: parsed.score || 0,
        type: parsed.type || 'action',
        description: parsed.description || 'Unknown moment',
      };
    } catch (error) {
      logger.debug(`Error analyzing timestamp ${timestamp}`, error);
      return { score: 0, type: 'action', description: 'Analysis failed' };
    }
  }

  private async expandHighlightRegion(
    videoPath: string,
    centerTimestamp: number,
    highlightInfo: any
  ): Promise<Highlight> {
    const minDuration = config.highlights.minDuration;
    const maxDuration = config.highlights.maxDuration;
    const duration = maxDuration;

    const startTime = Math.max(0, centerTimestamp - duration / 2);
    const videoDuration = await this.getVideoDuration(videoPath);
    const endTime = Math.min(videoDuration, startTime + duration);

    return {
      startTime: Math.round(startTime),
      endTime: Math.round(endTime),
      score: highlightInfo.score,
      type: highlightInfo.type,
      description: highlightInfo.description,
    };
  }

  private overlapsWithExisting(highlight: Highlight, existing: Highlight[]): boolean {
    return existing.some(
      (h) =>
        (highlight.startTime < h.endTime && highlight.endTime > h.startTime)
    );
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error('Failed to get video duration', err);
          resolve(0);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
