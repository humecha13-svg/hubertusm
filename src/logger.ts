import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = levels[config.logging.level as LogLevel] || levels.info;

export const logger = {
  debug: (message: string, data?: any) => {
    if (levels.debug >= currentLevel) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
  info: (message: string, data?: any) => {
    if (levels.info >= currentLevel) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (levels.warn >= currentLevel) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    if (levels.error >= currentLevel) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  },
};
