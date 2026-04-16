import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';

import { AppAccessGate } from './src/components/AppAccessGate';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { isDark } = useAppTheme();

  return (
    <AppAccessGate>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </AuthProvider>
    </AppAccessGate>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}
