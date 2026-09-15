import Ionicons from '@expo/vector-icons/Ionicons';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, HeadingFont, Radius, Spacing } from '@/constants/theme';
import { clearReplyAudio, missingVoiceKeys, runVoicePipeline, VoiceTurn } from '@/lib/voice';

/** How many prior turns to send as context. Keeps requests small and replies coherent. */
const HISTORY_TURNS = 10;

/**
 * Mono 16 kHz is what speech recognition actually wants — stereo CD-quality
 * audio just makes the upload slower without improving the transcript.
 */
const VOICE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

type Status = 'idle' | 'recording' | 'thinking' | 'speaking';

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Tap the microphone and start talking',
  recording: "I'm listening — tap again when you're done",
  thinking: 'Thinking about what you said...',
  speaking: 'Sudhi is speaking — tap to reply',
};

function RecordButton({
  status,
  onPress,
  disabled,
}: {
  status: Status;
  onPress: () => void;
  disabled: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== 'recording') {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  const isRecording = status === 'recording';
  const isBusy = status === 'thinking';

  return (
    <View style={styles.buttonArea}>
      {isRecording && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) },
              ],
            },
          ]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start talking to Sudhi'}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.recordButton,
          isRecording && styles.recordButtonActive,
          disabled && styles.recordButtonDisabled,
        ]}>
        {isBusy ? (
          <ActivityIndicator color={Colors.onPrimary} size="large" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : status === 'speaking' ? 'volume-high' : 'mic'}
            size={40}
            color={Colors.onPrimary}
          />
        )}
      </Pressable>
    </View>
  );
}

export default function Sudhi() {
  const [status, setStatus] = useState<Status>('idle');
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replyUri, setReplyUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(VOICE_RECORDING);
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(replyUri ?? undefined);
  const playerStatus = useAudioPlayerStatus(player);

  const scrollRef = useRef<ScrollView>(null);
  const playedUriRef = useRef<string | null>(null);
  const missingKeys = missingVoiceKeys();

  // Play each reply once its audio has loaded.
  useEffect(() => {
    if (!replyUri || !playerStatus.isLoaded || playedUriRef.current === replyUri) return;
    playedUriRef.current = replyUri;
    player.play();
    setStatus('speaking');
  }, [replyUri, playerStatus.isLoaded, player]);

  useEffect(() => {
    if (playerStatus.didJustFinish) setStatus('idle');
  }, [playerStatus.didJustFinish]);

  useEffect(() => clearReplyAudio, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (player.playing) player.pause();

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Sudhi needs permission to use the microphone.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
    } catch {
      setError('Could not start the microphone. Please try again.');
      setStatus('idle');
    }
  }, [player, recorder]);

  const stopAndRespond = useCallback(async () => {
    setStatus('thinking');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      // iOS keeps audio in the quiet earpiece route until recording is released.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      if (!uri) {
        setError("I didn't catch that. Could you try again?");
        setStatus('idle');
        return;
      }

      const exchange = await runVoicePipeline(uri, turns.slice(-HISTORY_TURNS));
      const stamp = Date.now();
      setTurns((prev) => [
        ...prev,
        { id: `${stamp}-patient`, role: 'patient', text: exchange.transcript },
        { id: `${stamp}-sudhi`, role: 'sudhi', text: exchange.replyText },
      ]);
      setReplyUri(exchange.replyAudioUri);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
      setStatus('idle');
    }
  }, [recorder, turns]);

  const onPressMic = () => {
    if (status === 'recording') {
      void stopAndRespond();
      return;
    }
    if (status === 'thinking') return;
    void startRecording();
  };

  const seconds = Math.floor(recorderState.durationMillis / 1000);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Sudhi</Text>
      <Text style={styles.subheader}>
        Speak in any language you like — I&apos;ll answer in the same one.
      </Text>

      {missingKeys.length > 0 && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            Voice is not configured. Add {missingKeys.join(' and ')} to your .env file.
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.transcript}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {turns.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Say hello to Sudhi</Text>
            <Text style={styles.emptyBody}>
              Tap the microphone below, say whatever is on your mind, then tap it again. Sudhi will
              listen and answer out loud.
            </Text>
          </View>
        ) : (
          turns.map((turn) => (
            <View
              key={turn.id}
              style={[
                styles.bubble,
                turn.role === 'sudhi' ? styles.bubbleSudhi : styles.bubblePatient,
              ]}>
              <Text
                style={turn.role === 'sudhi' ? styles.bubbleTextSudhi : styles.bubbleTextPatient}>
                {turn.text}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.controls}>
        {error && <Text style={styles.error}>{error}</Text>}
        <RecordButton status={status} onPress={onPressMic} disabled={missingKeys.length > 0} />
        <Text style={styles.statusLabel}>
          {status === 'recording' && seconds > 0
            ? `${STATUS_LABEL.recording} · ${seconds}s`
            : STATUS_LABEL[status]}
        </Text>
        <Text style={styles.disclaimer}>
          A friendly companion, not medical advice. Nothing you say is saved.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 24,
    fontFamily: HeadingFont.semiBold,
    color: Colors.primary,
    textAlign: 'center',
    paddingTop: Spacing.three,
  },
  subheader: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: Spacing.four,
  },
  noticeBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    backgroundColor: Colors.orangeSoft,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.text,
    textAlign: 'center',
  },
  transcript: {
    padding: Spacing.four,
    gap: Spacing.two,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: HeadingFont.semiBold,
    color: Colors.text,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  bubbleSudhi: {
    backgroundColor: Colors.mintSoft,
    alignSelf: 'flex-start',
  },
  bubblePatient: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  bubbleTextSudhi: {
    fontFamily: Fonts?.sans,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.text,
  },
  bubbleTextPatient: {
    fontFamily: Fonts?.sans,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.onPrimary,
  },
  controls: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  buttonArea: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.danger,
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    backgroundColor: Colors.danger,
  },
  recordButtonDisabled: {
    opacity: 0.4,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: Colors.danger,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
