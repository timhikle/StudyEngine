import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from './src/theme';
import { useStore } from './src/store/useStore';
import { BackgroundService } from './src/services/background';
import { HomeScreen } from './src/screens/HomeScreen';
import { ConsoleScreen } from './src/screens/ConsoleScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { NotificationBar } from './src/components/NotificationBar';

type Screen = 'home' | 'console' | 'schedule';

const TABS: { key: Screen; icon: string; label: string }[] = [
  { key: 'home', icon: '◉', label: 'Study' },
  { key: 'console', icon: '▶', label: 'Console' },
  { key: 'schedule', icon: '☰', label: 'Schedule' },
];

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = React.useState<Screen>('home');
  const syncFromService = useStore((s) => s.syncFromService);

  useEffect(() => {
    syncFromService();
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen />;
      case 'console':
        return <ConsoleScreen />;
      case 'schedule':
        return <ScheduleScreen />;
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>{renderScreen()}</View>
      <NotificationBar />
      <View style={styles.tabBar}>
        {TABS.map(({ key, icon, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeScreen === key && styles.activeTab]}
            onPress={() => setActiveScreen(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeScreen === key && styles.activeTabIcon]}>
              {icon}
            </Text>
            <Text style={[styles.tabLabel, activeScreen === key && styles.activeTabLabel]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingBottom: 20,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  activeTab: {},
  tabIcon: {
    fontSize: 20,
    color: colors.secondary,
    marginBottom: 2,
  },
  activeTabIcon: {
    color: colors.accent,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: colors.accent,
  },
});

export default App;
