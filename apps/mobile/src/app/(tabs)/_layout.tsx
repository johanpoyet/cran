import { router, Tabs } from 'expo-router';

import { TAB_ROUTES, TabBar, type TabRoute } from '../../ui';

function isTabRoute(name: string | undefined): name is TabRoute {
  return TAB_ROUTES.includes(name as TabRoute);
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => {
        const current = state.routes[state.index]?.name;
        return (
          <TabBar
            active={isTabRoute(current) ? current : 'index'}
            onNavigate={(route) => {
              const target = state.routes.find(({ name }) => name === route);
              if (target) navigateToTab(target.key);
            }}
            onAdd={() => {
              router.push('/add');
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="weight" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
