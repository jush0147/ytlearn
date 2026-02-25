import { SubtitleCue } from '../types/subtitle';

const INNERTUBE_PLAYER_URL = 'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

export class SubtitleNotAvailableError extends Error {
  constructor(message = 'No subtitles available') {
    super(message);
    this.name = 'SubtitleNotAvailableError';
  }
}

type CaptionTrack = {
  baseUrl?: string;
};

type InnertubePlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
};

type Json3Event = {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8?: string }>;
};

type Json3SubtitleResponse = {
  events?: Json3Event[];
};

const cleanSubtitleText = (text: string): string =>
  text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toJson3Url = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'json3');
  return url.toString();
};

const mapJson3ToCues = (json3: Json3SubtitleResponse): SubtitleCue[] => {
  const events = json3.events ?? [];

  return events
    .map((event, index) => {
      const rawText = (event.segs ?? []).map((segment) => segment.utf8 ?? '').join('');
      const text = cleanSubtitleText(rawText);
      const startTimeMs = event.tStartMs ?? 0;
      const durationMs = event.dDurationMs ?? 0;

      if (!text) {
        return null;
      }

      return {
        id: `${index}-${startTimeMs}`,
        startTime: startTimeMs / 1000,
        duration: durationMs / 1000,
        text,
      } satisfies SubtitleCue;
    })
    .filter((cue): cue is SubtitleCue => cue !== null);
};

export const fetchSubtitlesFromInnertube = async (videoId: string): Promise<SubtitleCue[]> => {
  const response = await fetch(INNERTUBE_PLAYER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.09.37',
          androidSdkVersion: 30,
        },
      },
      videoId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Innertube player request failed: ${response.status}`);
  }

  const playerJson = (await response.json()) as InnertubePlayerResponse;
  const captionTracks = playerJson.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0 || !captionTracks[0]?.baseUrl) {
    throw new SubtitleNotAvailableError();
  }

  const subtitleResponse = await fetch(toJson3Url(captionTracks[0].baseUrl));
  if (!subtitleResponse.ok) {
    throw new SubtitleNotAvailableError();
  }

  const subtitleJson = (await subtitleResponse.json()) as Json3SubtitleResponse;
  const cues = mapJson3ToCues(subtitleJson);

  if (cues.length === 0) {
    throw new SubtitleNotAvailableError();
  }

  return cues;
};
