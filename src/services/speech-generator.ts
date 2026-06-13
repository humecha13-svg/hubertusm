import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';

export interface SpeechSegment {
  text: string;
  startTime: number;
  endTime: number;
  audioPath?: string;
}

export class SpeechGenerator {
  private openai: OpenAI;
  private voiceId: string;

  constructor(voiceId?: string) {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.voiceId = voiceId || config.openai.voiceId || 'nova';
  }

  async generateCommentary(highlight: {
    description: string;
    type: string;
    score: number;
  }): Promise<string> {
    try {
      logger.debug('Generating AI commentary for highlight');

      const commentaryPrompts: Record<string, string> = {
        goal: `Generate an exciting, short sports commentary (max 30 words) about a goal being scored. Make it dramatic and enthusiastic. Highlight: ${highlight.description}`,
        save: `Generate an excited sports commentary (max 30 words) about an incredible goalkeeper save. Make it dramatic. Highlight: ${highlight.description}`,
        foul: `Generate a serious sports commentary (max 30 words) about a controversial foul or red card. Highlight: ${highlight.description}`,
        celebration: `Generate an excited sports commentary (max 30 words) about players celebrating. Make it joyful. Highlight: ${highlight.description}`,
        dramatic_moment: `Generate dramatic sports commentary (max 30 words) about an unbelievable moment. Highlight: ${highlight.description}`,
        action: `Generate engaging sports commentary (max 30 words) about intense football action. Highlight: ${highlight.description}`,
      };

      const prompt =
        commentaryPrompts[highlight.type] ||
        commentaryPrompts.action;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.8,
      });

      const commentary =
        response.choices[0].message.content || 'Check this moment!';
      return commentary;
    } catch (error) {
      logger.error('Failed to generate commentary', error);
      return 'Amazing moment!';
    }
  }

  async generateSpeech(text: string, outputPath: string): Promise<string> {
    try {
      logger.info(`Generating speech for: "${text}"`);

      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: this.voiceId as any,
        input: text,
      });

      const buffer = await response.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(buffer));

      logger.info(`Speech generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Failed to generate speech', error);
      throw error;
    }
  }

  async generateSpeechSegments(
    highlights: Array<{ description: string; type: string; score: number; startTime: number; endTime: number }>
  ): Promise<SpeechSegment[]> {
    try {
      const segments: SpeechSegment[] = [];

      for (const highlight of highlights) {
        const commentary = await this.generateCommentary(highlight);

        // Create unique filename for this segment
        const filename = `speech_${Date.now()}_${highlights.indexOf(highlight)}.mp3`;
        const audioPath = path.join(config.video.tempDir, filename);

        await this.generateSpeech(commentary, audioPath);

        segments.push({
          text: commentary,
          startTime: highlight.startTime,
          endTime: highlight.endTime,
          audioPath,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      logger.info(`Generated ${segments.length} speech segments`);
      return segments;
    } catch (error) {
      logger.error('Failed to generate speech segments', error);
      throw error;
    }
  }
}
