import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useStore } from '../store/useStore';
import { useT } from '../i18n';

export const SettingsScreen: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const schedule = useStore((s) => s.schedule);
  const t = useT();

  const inc = (key: 'studyDuration' | 'shortBreakDuration' | 'phaseDuration' | 'bigBreakDuration' | 'intervalsPerPhase', delta: number) => {
    const min = key === 'intervalsPerPhase' ? 2 : 5;
    const max = key === 'intervalsPerPhase' ? 8 : key === 'studyDuration' ? 60 : key === 'shortBreakDuration' ? 30 : key === 'bigBreakDuration' ? 90 : 240;
    const current = settings[key];
    const next = Math.min(max, Math.max(min, current + delta));
    if (next !== current) updateSettings({ [key]: next });
  };

  const toggle = (key: 'soundEnabled' | 'tierBEnabled') => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.canvas} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings')}</Text>
        </View>

        {schedule.length > 0 && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>Changes apply to the next schedule only</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, settings.lang === 'en' && styles.langBtnActive]}
              onPress={() => updateSettings({ lang: 'en' })}
              activeOpacity={0.7}
            >
              <Text style={[styles.langBtnText, settings.lang === 'en' && styles.langBtnTextActive]}>{t('english')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, settings.lang === 'ar' && styles.langBtnActive]}
              onPress={() => updateSettings({ lang: 'ar' })}
              activeOpacity={0.7}
            >
              <Text style={[styles.langBtnText, settings.lang === 'ar' && styles.langBtnTextActive]}>{t('arabic')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('study')} {t('interval')}s</Text>

        <SettingRow label={t('studyDuration')} value={`${settings.studyDuration} ${t('minutes')}`} onDec={() => inc('studyDuration', -5)} onInc={() => inc('studyDuration', 5)} />
        <SettingRow label={t('shortBreakDuration')} value={`${settings.shortBreakDuration} ${t('minutes')}`} onDec={() => inc('shortBreakDuration', -1)} onInc={() => inc('shortBreakDuration', 1)} />
        <SettingRow label={t('phaseDuration')} value={`${settings.phaseDuration} ${t('minutes')}`} onDec={() => inc('phaseDuration', -10)} onInc={() => inc('phaseDuration', 10)} />
        <SettingRow label={t('bigBreakDuration')} value={`${settings.bigBreakDuration} ${t('minutes')}`} onDec={() => inc('bigBreakDuration', -5)} onInc={() => inc('bigBreakDuration', 5)} />
        <SettingRow label={t('intervalsPerPhase')} value={`${settings.intervalsPerPhase}`} onDec={() => inc('intervalsPerPhase', -1)} onInc={() => inc('intervalsPerPhase', 1)} />

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Sound</Text>

        <ToggleRow label={t('soundEnabled')} value={settings.soundEnabled} onToggle={() => toggle('soundEnabled')} />
        <ToggleRow label={t('tierBEnabled')} value={settings.tierBEnabled} onToggle={() => toggle('tierBEnabled')} />

        <View style={styles.about}>
          <Text style={styles.aboutText}>Phase Study v1.0</Text>
          <Text style={styles.aboutSub}>AI-Powered Study Timer</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function SettingRow({ label, value, onDec, onInc }: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>
        <TouchableOpacity style={styles.adjBtn} onPress={onDec} activeOpacity={0.6}>
          <Text style={styles.adjBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.rowValue}>{value}</Text>
        <TouchableOpacity style={styles.adjBtn} onPress={onInc} activeOpacity={0.6}>
          <Text style={styles.adjBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  header: { marginBottom: spacing.xl },
  title: { ...typography.h3, color: colors.activeText },
  warning: { backgroundColor: 'rgba(234,179,8,0.12)', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md },
  warningText: { color: colors.warning, fontSize: 13, textAlign: 'center' },
  sectionTitle: { ...typography.label, color: colors.secondary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.sm,
  },
  rowLabel: { ...typography.body, color: colors.activeText, flex: 1 },
  rowControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjBtn: {
    width: 36, height: 36, borderRadius: borderRadius.full,
    backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  adjBtnText: { color: colors.accent, fontSize: 20, fontWeight: '600' },
  rowValue: { ...typography.body, color: colors.accent, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  toggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: colors.canvas,
    justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: colors.cardBorder,
  },
  toggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.secondary },
  toggleKnobOn: { backgroundColor: colors.canvas, alignSelf: 'flex-end' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.canvas,
  },
  langBtnActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}20` },
  langBtnText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  langBtnTextActive: { color: colors.accent },
  about: { alignItems: 'center', marginTop: spacing.xl, opacity: 0.5 },
  aboutText: { ...typography.bodySmall, color: colors.secondary },
  aboutSub: { ...typography.label, color: colors.secondary, fontSize: 11 },
});
