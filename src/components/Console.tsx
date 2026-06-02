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
import { useT, getLang } from '../i18n';

export const Console: React.FC = () => {
  const inputRef = useRef<TextInput>(null);
  const consoleInput = useStore((s) => s.consoleInput);
  const setConsoleInput = useStore((s) => s.setConsoleInput);
  const sendConsoleCommand = useStore((s) => s.sendConsoleCommand);
  const isParsing = useStore((s) => s.isParsing);
  const isConsoleLocked = useStore((s) => s.isConsoleLocked);
  const error = useStore((s) => s.error);
  const t = useT();

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
          <Text style={styles.title}>{t('aiConsole')}</Text>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t('gemini')}</Text>
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
            placeholder={getLang() === 'ar' ? t('consoleHintAr') : t('consoleHint')}
            placeholderTextColor={colors.secondary}
            multiline={false}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isConsoleLocked}
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {isParsing ? (
              <ActivityIndicator color={colors.canvas} size="small" />
            ) : (
              <Text style={[styles.sendText, !canSend && styles.sendTextDisabled]}>→</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: { zIndex: 10 },
  container: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: { ...typography.bodySmall, color: colors.activeText, fontWeight: '700', marginRight: spacing.xs },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginRight: spacing.xs },
  statusText: { ...typography.label, color: colors.accent, fontSize: 10 },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  errorText: { color: colors.alert, fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.activeText,
    backgroundColor: colors.canvas,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.cardBorder },
  sendText: { color: colors.canvas, fontSize: 18 },
  sendTextDisabled: { color: colors.secondary },
});
