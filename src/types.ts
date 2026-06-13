export interface Highlight {
  startTime: number;
  endTime: number;
  score: number;
  description: string;
  type: 'goal' | 'save' | 'foul' | 'celebration' | 'dramatic_moment' | 'action';
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  channelTitle: string;
  publishedAt: string;
}

export interface ProcessingJob {
  id: string;
  videoId: string;
  videoUrl: string;
  status: 'pending' | 'downloading' | 'analyzing' | 'processing' | 'uploading' | 'completed' | 'failed';
  highlights: Highlight[];
  createdShorts: string[];
  error?: string;
  progress: number;
}

export interface Short {
  title: string;
  description: string;
  tags: string[];
  filePath: string;
  duration: number;
  highlightIndex: number;
}
