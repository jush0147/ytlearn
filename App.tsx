import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import {
  fetchSubtitlesFromInnertube,
  SubtitleNotAvailableError,
} from './src/services/subtitles';
import { usePlayerStore } from './src/store/playerStore';
import { SubtitleCue } from './src/types/subtitle';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const extractYoutubeVideoId = (input: string): string | null => {
  const trimmed = input.trim();

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes('youtu.be')) {
      const shortId = url.pathname.replace('/', '');
      return YOUTUBE_ID_REGEX.test(shortId) ? shortId : null;
    }

    if (url.hostname.includes('youtube.com')) {
      const fromSearchParams = url.searchParams.get('v');
      if (fromSearchParams && YOUTUBE_ID_REGEX.test(fromSearchParams)) {
        return fromSearchParams;
      }

      const pathSegments = url.pathname.split('/').filter(Boolean);
      const embedIndex = pathSegments.findIndex(
        (segment) => segment === 'embed' || segment === 'shorts',
      );

      if (embedIndex !== -1) {
        const pathId = pathSegments[embedIndex + 1];
        return pathId && YOUTUBE_ID_REGEX.test(pathId) ? pathId : null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const findActiveSubtitleIndex = (subtitles: SubtitleCue[], currentTime: number): number =>
  subtitles.findIndex((cue) => {
    const cueEndTime = cue.startTime + cue.duration;
    return currentTime >= cue.startTime && currentTime < cueEndTime;
  });

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [showInvalidError, setShowInvalidError] = useState(false);

  const playerRef = useRef<YoutubeIframeRef>(null);
  const subtitleListRef = useRef<any>(null);

  const {
    videoId,
    subtitles,
    subtitleState,
    activeSubtitleIndex,
    setVideoId,
    setSubtitles,
    setSubtitleState,
    setActiveSubtitleIndex,
    setCurrentTime,
    resetPlaybackSync,
  } = usePlayerStore();

  const hasLoadedVideo = useMemo(() => videoId !== null, [videoId]);

  const onImport = useCallback(async () => {
    Keyboard.dismiss();
    const parsedVideoId = extractYoutubeVideoId(urlInput);

    if (!parsedVideoId) {
      setShowInvalidError(true);
      return;
    }

    setShowInvalidError(false);
    resetPlaybackSync();
    setVideoId(parsedVideoId);
    setSubtitleState('loading');

    try {
      const cues = await fetchSubtitlesFromInnertube(parsedVideoId);
      setSubtitles(cues);
      setSubtitleState('loaded');
    } catch (error) {
      setSubtitles([]);

      if (error instanceof SubtitleNotAvailableError) {
        setSubtitleState('unavailable');
        return;
      }

      setSubtitleState('unavailable');
    }
  }, [
    resetPlaybackSync,
    setSubtitleState,
    setSubtitles,
    setVideoId,
    urlInput,
  ]);

  useEffect(() => {
    if (!videoId || subtitleState !== 'loaded' || subtitles.length === 0) {
      setActiveSubtitleIndex(-1);
      return;
    }

    const intervalId = setInterval(() => {
      const player = playerRef.current;
      if (!player) {
        return;
      }

      player
        .getCurrentTime()
        .then((time) => {
          setCurrentTime(time);
          const activeIndex = findActiveSubtitleIndex(subtitles, time);
          setActiveSubtitleIndex(activeIndex);
        })
        .catch(() => {
          // Ignore transient iframe bridge failures.
        });
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    setActiveSubtitleIndex,
    setCurrentTime,
    subtitleState,
    subtitles,
    videoId,
  ]);

  useEffect(() => {
    if (activeSubtitleIndex < 0 || !subtitleListRef.current) {
      return;
    }

    subtitleListRef.current.scrollToIndex({
      animated: true,
      index: activeSubtitleIndex,
      viewPosition: 0.5,
    });
  }, [activeSubtitleIndex]);

  const onPressSubtitle = useCallback((cue: SubtitleCue, index: number) => {
    playerRef.current?.seekTo(cue.startTime, true);
    setActiveSubtitleIndex(index);
    setCurrentTime(cue.startTime);
  }, [setActiveSubtitleIndex, setCurrentTime]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.inputRow}>
        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="Paste YouTube URL"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Pressable onPress={onImport} style={styles.importButton}>
          <Text style={styles.importButtonText}>Import</Text>
        </Pressable>
      </View>

      {showInvalidError ? (
        <Text style={styles.errorText}>無效的 YouTube 網址</Text>
      ) : null}

      <View style={styles.playerContainer}>
        {hasLoadedVideo ? (
          <YoutubePlayer
            ref={playerRef}
            height={240}
            play={false}
            videoId={videoId}
            initialPlayerParams={{ controls: 0 }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>匯入 YouTube 連結後開始播放</Text>
          </View>
        )}
      </View>

      <View style={styles.subtitlePanel}>
        {subtitleState === 'loading' ? (
          <View style={styles.centerState}>
            <ActivityIndicator />
            <Text style={styles.stateText}>字幕載入中...</Text>
          </View>
        ) : null}

        {subtitleState === 'unavailable' ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>此影片無字幕</Text>
          </View>
        ) : null}

        {subtitleState === 'loaded' ? (
          <FlashList
            ref={subtitleListRef}
            data={subtitles}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isActive = index === activeSubtitleIndex;
              return (
                <Pressable
                  onPress={() => onPressSubtitle(item, index)}
                  style={[
                    styles.subtitleItem,
                    isActive ? styles.subtitleItemActive : null,
                  ]}
                >
                  <Text style={styles.subtitleText}>{item.text}</Text>
                </Pressable>
              );
            }}
            contentContainerStyle={styles.subtitleList}
          />
        ) : null}

        {subtitleState === 'idle' ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>字幕列表會顯示在這裡</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#f8fafc',
  },
  importButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    color: '#dc2626',
  },
  playerContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
    minHeight: 240,
  },
  placeholder: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#e5e7eb',
  },
  subtitlePanel: {
    marginTop: 12,
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateText: {
    color: '#475569',
  },
  subtitleList: {
    padding: 12,
  },
  subtitleItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  subtitleItemActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#60a5fa',
  },
  subtitleText: {
    color: '#0f172a',
    lineHeight: 20,
  },
});
