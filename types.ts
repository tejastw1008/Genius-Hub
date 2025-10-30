
export enum View {
  PPT_GENERATOR = 'PPT_GENERATOR',
  HOMEWORK_HELPER = 'HOMEWORK_HELPER',
  CREATIVE_STUDIO = 'CREATIVE_STUDIO',
  ANALYZER_SUITE = 'ANALYZER_SUITE',
  LIVE_TUTOR = 'LIVE_TUTOR',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

export interface Slide {
  title: string;
  content: string[];
  speakerNotes: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
