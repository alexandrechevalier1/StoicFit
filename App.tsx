import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  return (
    <>
      <RootNavigator />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}
