import { logger } from '../logger';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';

export interface Caption {
  startTime: number;
  endTime: number;
  text: string;
}

export class CaptionGenerator {
  generateCaptions(
    highlights: Array<{ description: string; type: string; startTime: number; endTime: number }>
  ): Caption[] {
    try {
      logger.info('Generating captions for highlights');

      const captions: Caption[] = [];

      for (const highlight of highlights) {
        // Create caption text based on highlight type
        const captionText = this.generateCaption(highlight);

        captions.push({
          startTime: highlight.startTime,
          endTime: highlight.endTime,
          text: captionText,
        });
      }

      return captions;
    } catch (error) {
      logger.error('Failed to generate captions', error);
      return [];
    }
  }

  private generateCaption(highlight: {
    type: string;
    description: string;
  }): string {
    const captionTemplates: Record<string, string[]> = {
      goal: [
        '⚽ GOAL! 🎯',
        '🙌 THE BALL IS IN! ⚽',
        '✨ INCREDIBLE FINISH! ⚽',
      ],
      save: [
        '🧤 WORLD CLASS SAVE! 🔥',
        '💪 INCREDIBLE REFLEXES! 🧤',
        '⛔ STUNNING STOP! 🔥',
      ],
      foul: [
        '🔴 RED CARD! ⚠️',
        '😤 CONTROVERSIAL DECISION',
        '⚠️ YELLOW CARD',
      ],
      celebration: [
        '🎉 PURE JOY! 🙌',
        '💃 CELEBRATION TIME! 🎊',
        '🎊 THE TEAM ERUPTS! 🙌',
      ],
      dramatic_moment: [
        '😱 UNBELIEVABLE! 🤯',
        '⚡ WHAT A MOMENT! ✨',
        '🔥 DRAMA UNFOLDS! 🎬',
      ],
      action: [
        '⚡ INTENSE ACTION! ⚽',
        '💥 PURE FOOTBALL! 🔥',
        '🎯 BRILLIANT PLAY! ✨',
      ],
    };

    const templates = captionTemplates[highlight.type] || captionTemplates.action;
    const randomCaption = templates[Math.floor(Math.random() * templates.length)];

    return randomCaption;
  }

  async saveCaptionsToSRT(captions: Caption[], outputPath: string): Promise<void> {
    try {
      logger.info(`Saving captions to SRT file: ${outputPath}`);

      let srtContent = '';

      for (let i = 0; i < captions.length; i++) {
        const caption = captions[i];
        const sequence = i + 1;
        const startTime = this.formatSRTTime(caption.startTime);
        const endTime = this.formatSRTTime(caption.endTime);

        srtContent += `${sequence}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${caption.text}\n\n`;
      }

      await fs.writeFile(outputPath, srtContent);
      logger.info(`Captions saved: ${outputPath}`);
    } catch (error) {
      logger.error('Failed to save captions', error);
      throw error;
    }
  }

  async saveCaptionstToVTT(captions: Caption[], outputPath: string): Promise<void> {
    try {
      logger.info(`Saving captions to VTT file: ${outputPath}`);

      let vttContent = 'WEBVTT\n\n';

      for (const caption of captions) {
        const startTime = this.formatVTTTime(caption.startTime);
        const endTime = this.formatVTTTime(caption.endTime);

        vttContent += `${startTime} --> ${endTime}\n`;
        vttContent += `${caption.text}\n\n`;
      }

      await fs.writeFile(outputPath, vttContent);
      logger.info(`Captions saved: ${outputPath}`);
    } catch (error) {
      logger.error('Failed to save captions', error);
      throw error;
    }
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }
}
