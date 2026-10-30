import { ChartNoAxesColumn, House, type LucideIcon, Plus, User, Weight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, space, tabBar, touch } from '../theme/tokens';

export const TAB_ROUTES = ['index', 'journal', 'weight', 'profile'] as const;
export type TabRoute = (typeof TAB_ROUTES)[number];

const TABS: Record<
  TabRoute,
  { icon: LucideIcon; label: 'tabs.today' | 'tabs.journal' | 'tabs.weight' | 'tabs.profile' }
> = {
  index: { icon: House, label: 'tabs.today' },
  journal: { icon: ChartNoAxesColumn, label: 'tabs.journal' },
  weight: { icon: Weight, label: 'tabs.weight' },
  profile: { icon: User, label: 'tabs.profile' },
};

/** Distance between the bar and the bottom edge (the bar overlaps the home indicator area). */
export function tabBarBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset - 10, space[16]);
}

/** Bottom padding screens need so their last item scrolls above the floating bar. */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return tabBarBottomOffset(insets.bottom) + tabBar.height + space[24];
}

export interface TabBarProps {
  active: TabRoute;
  onNavigate: (route: TabRoute) => void;
  onAdd: () => void;
}

// Floating bar: Jour · Journal · + · Poids · Profil (mockup "B · Aujourd'hui").
export function TabBar({ active, onNavigate, onAdd }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const renderTab = (route: TabRoute) => {
    const { icon: Icon, label } = TABS[route];
    const selected = route === active;
    return (
      <Pressable
        key={route}
        accessibilityRole="tab"
        accessibilityLabel={t(label)}
        accessibilityState={{ selected }}
        onPress={() => {
          if (!selected) onNavigate(route);
        }}
        style={styles.tab}
      >
        <Icon
          size={tabBar.iconSize}
          color={selected ? colors.accent : colors.textMuted}
          strokeWidth={selected ? 2.25 : 2}
        />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { bottom: tabBarBottomOffset(insets.bottom) }]}
    >
      {renderTab('index')}
      {renderTab('journal')}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.add')}
        onPress={onAdd}
        style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
      >
        <Plus size={28} color={colors.onAccent} strokeWidth={2.5} />
      </Pressable>
      {renderTab('weight')}
      {renderTab('profile')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.screen,
    right: space.screen,
    height: tabBar.height,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: space[8],
    boxShadow: shadow.floating,
  },
  tab: {
    minWidth: touch.minSize,
    minHeight: touch.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: tabBar.actionSize,
    height: tabBar.actionSize,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: { opacity: 0.85 },
});
