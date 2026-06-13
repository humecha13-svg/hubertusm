import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../logger';
import { Highlight, Short } from '../types';

export class VideoProcessor {
  private outputDir: string;

  constructor() {
    this.outputDir = config.video.outputDir;
    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create output directory', error);
    }
  }

  async processHighlights(
    videoPath: string,
    highlights: Highlight[],
    videoTitle: string
  ): Promise<Short[]> {
    try {
      logger.info(`Processing ${highlights.length} highlights from ${videoTitle}`);

      const shorts: Short[] = [];
      const maxShorts = Math.min(highlights.length, 5); // Limit to 5 shorts per video

      // Process top highlights by score
      const topHighlights = highlights.slice(0, maxShorts);

      for (let i = 0; i < topHighlights.length; i++) {
        const highlight = topHighlights[i];
        const short = await this.createShort(videoPath, highlight, videoTitle, i);

        if (short) {
          shorts.push(short);
        }
      }

      logger.info(`Created ${shorts.length} shorts`);
      return shorts;
    } catch (error) {
      logger.error('Failed to process highlights', error);
      throw error;
    }
  }

  private async createShort(
    videoPath: string,
    highlight: Highlight,
    videoTitle: string,
    index: number
  ): Promise<Short | null> {
    return new Promise((resolve) => {
      const outputFilename = `${videoTitle.replace(/\s+/g, '_')}_highlight_${index + 1}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      logger.info(`Creating short from ${highlight.startTime}s to ${highlight.endTime}s`);

      ffmpeg(videoPath)
        .setStartTime(highlight.startTime)
        .duration(highlight.endTime - highlight.startTime)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-crf 23',
          '-preset medium',
          '-pix_fmt yuv420p',
          '-aspect 9:16',
        ])
        .on('end', () => {
          logger.info(`Short created: ${outputPath}`);
          resolve({
            title: this.generateTitle(highlight, videoTitle),
            description: this.generateDescription(highlight, videoTitle),
            tags: this.generateTags(highlight),
            filePath: outputPath,
            duration: highlight.endTime - highlight.startTime,
            highlightIndex: index,
          });
        })
        .on('error', (err) => {
          logger.error(`Failed to create short`, err);
          resolve(null);
        })
        .save(outputPath);
    });
  }

  private generateTitle(highlight: Highlight, videoTitle: string): string {
    const highlights: Record<Highlight['type'], string[]> = {
      goal: ['GOAL! 🎯', 'AMAZING GOAL! ⚽', 'INCREDIBLE FINISH!'],
      save: ['INCREDIBLE SAVE! 🧤', 'WORLD CLASS SAVE!', 'STUNNING SAVE!'],
      foul: ['RED CARD! 🔴', 'CONTROVERSIAL DECISION!', 'MASSIVE FOUL!'],
      celebration: ['PURE JOY! 🎉', 'CELEBRATION TIME!', 'THE TEAM GOES WILD!'],
      dramatic_moment: ['DRAMA! 😱', 'WHAT A MOMENT!', 'UNBELIEVABLE!'],
      action: ['ACTION PACKED! ⚡', 'INTENSE MOMENT!', 'PURE FOOTBALL!'],
    };

    const options = highlights[highlight.type] || highlights.action;
    const randomTitle = options[Math.floor(Math.random() * options.length)];

    return `${randomTitle} #Shorts #Football #WorldCup`;
  }

  private generateDescription(highlight: Highlight, videoTitle: string): string {
    const baseDescription = `Highlights from ${videoTitle}\n\n`;
    const highlightDescription = `${highlight.description}\n\n`;
    const cta = `Subscribe for more incredible football moments! 🔔⚽\n#Football #Highlights #YouTubeShorts`;

    return baseDescription + highlightDescription + cta;
  }

  private generateTags(highlight: Highlight): string[] {
    const baseTags = ['football', 'worldcup', 'shorts', 'highlights', 'soccer'];
    const typeTags: Record<Highlight['type'], string[]> = {
      goal: ['goal', 'scored', 'amazing'],
      save: ['save', 'goalkeeper', 'incredible'],
      foul: ['foul', 'redcard', 'controversial'],
      celebration: ['celebration', 'joy', 'team'],
      dramatic_moment: ['drama', 'moment', 'unbelievable'],
      action: ['action', 'intense', 'football'],
    };

    return [...baseTags, ...typeTags[highlight.type]];
  }
}
