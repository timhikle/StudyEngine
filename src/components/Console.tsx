import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';

export const Console: React.FC = () => {
  const inputRef = useRef<TextInput>(null);
  const consoleInput = useStore((s) => s.consoleInput);
  const setConsoleInput = useStore((s) => s.setConsoleInput);
  const sendConsoleCommand = useStore((s) => s.sendConsoleCommand);
  const isParsing = useStore((s) => s.isParsing);
  const isConsoleLocked = useStore((s) => s.isConsoleLocked);
  const error = useStore((s) => s.error);

  const handleSend = useCallback(() => {
    if (!consoleInput.trim() || isConsoleLocked) return;
    sendConsoleCommand(consoleInput.trim());
  }, [consoleInput, isConsoleLocked]);

  const canSend = consoleInput.trim().length > 0 && !isConsoleLocked && !isParsing;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Console</Text>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Gemini 2.5 Flash-Lite</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={consoleInput}
            onChangeText={setConsoleInput}
            placeholder="I want to study from 3:00 PM to 7:00 PM"
            placeholderTextColor={colors.secondary}
            multiline
            maxLength={500}
            editable={!isConsoleLocked}
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {isParsing ? (
              <ActivityIndicator size="small" color={colors.canvas} />
            ) : (
              <Text style={styles.sendIcon}>→</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.hints}>
          <Text style={styles.hintText}>
            Try: "Extend break", "أدرس من 3 إلى 7", "مدد الاستراحة 10 دقائق"
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontSize: 11,
  },
  errorBanner: {
    backgroundColor: colors.alert + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.alert,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.activeText,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
    color: colors.canvas,
    fontWeight: '700',
  },
  hints: {
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.bodySmall,
    color: colors.secondary,
    fontSize: 12,
    opacity: 0.7,
  },
});
