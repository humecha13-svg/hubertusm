import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../logger';
import { Highlight, Short } from '../types';
import { SpeechGenerator } from './speech-generator';
import { CaptionGenerator, Caption } from './caption-generator';

export class VideoProcessor {
  private outputDir: string;
  private speechGenerator: SpeechGenerator;
  private captionGenerator: CaptionGenerator;

  constructor() {
    this.outputDir = config.video.outputDir;
    this.speechGenerator = new SpeechGenerator();
    this.captionGenerator = new CaptionGenerator();
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
    try {
      const baseName = `${videoTitle.replace(/\s+/g, '_')}_highlight_${index + 1}`;
      const outputPath = path.join(this.outputDir, `${baseName}.mp4`);
      const baseVideoPath = path.join(this.outputDir, `${baseName}_base.mp4`);
      const voiceOverPath = path.join(config.video.tempDir, `${baseName}_voiceover.mp3`);
      const captionPath = path.join(this.outputDir, `${baseName}.srt`);

      logger.info(`Creating short from ${highlight.startTime}s to ${highlight.endTime}s`);

      // Step 1: Create base video
      await this.createBaseVideo(videoPath, highlight, baseVideoPath);

      // Step 2: Generate voice-over commentary
      const commentary = await this.speechGenerator.generateCommentary(highlight);
      await this.speechGenerator.generateSpeech(commentary, voiceOverPath);

      // Step 3: Generate captions
      const captions = this.captionGenerator.generateCaptions([
        {
          type: highlight.type,
          description: highlight.description,
          startTime: 0,
          endTime: highlight.endTime - highlight.startTime,
        },
      ]);
      await this.captionGenerator.saveCaptionsToSRT(captions, captionPath);

      // Step 4: Merge video with voice-over and captions
      await this.mergeWithVoiceOver(baseVideoPath, voiceOverPath, outputPath, captions);

      // Cleanup
      await fs.unlink(baseVideoPath).catch(() => {});

      logger.info(`Short created with voice-over and captions: ${outputPath}`);

      return {
        title: this.generateTitle(highlight, videoTitle),
        description: this.generateDescription(highlight, videoTitle),
        tags: this.generateTags(highlight),
        filePath: outputPath,
        duration: highlight.endTime - highlight.startTime,
        highlightIndex: index,
      };
    } catch (error) {
      logger.error(`Failed to create short`, error);
      return null;
    }
  }

  private createBaseVideo(
    videoPath: string,
    highlight: Highlight,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
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
          logger.debug(`Base video created: ${outputPath}`);
          resolve();
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  private mergeWithVoiceOver(
    videoPath: string,
    voiceOverPath: string,
    outputPath: string,
    captions: Caption[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build filter complex for captions
      const captionFilters = this.buildCaptionFilters(captions);

      let ffmpegCmd = ffmpeg(videoPath)
        .input(voiceOverPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-crf 23',
          '-preset medium',
          `-filter_complex "${captionFilters}"`,
          '-map "[outv]"',
          '-map "1:a"',
          '-shortest',
        ]);

      ffmpegCmd
        .on('end', () => {
          logger.debug(`Video with voice-over created: ${outputPath}`);
          resolve();
        })
        .on('error', reject)
        .save(outputPath);
    });
  }

  private buildCaptionFilters(captions: Caption[]): string {
    let filter = '[0:v]';

    // Add caption overlays
    for (const caption of captions) {
      const escapedText = caption.text.replace(/[:']/g, '\\$&');
      const fontScale = 1.5;
      const y = '(h-text_h)/2';

      filter += `drawtext=text='${escapedText}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=${fontScale * 30}:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=5:x=(w-text_w)/2:y=${y}:enable='between(t,${caption.startTime},${caption.endTime})'`;

      if (captions.indexOf(caption) < captions.length - 1) {
        filter += ',';
      }
    }

    filter += '[outv]';
    return filter;
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
