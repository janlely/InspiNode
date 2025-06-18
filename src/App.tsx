import * as React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as RNLocalize from 'react-native-localize';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import i18n from './i18n';
import { useTheme } from './hooks/useTheme';
import { RootStackParamList } from './Types';
import Home from './pages/Home';
import Search from './pages/Search';
import EditorPage from './pages/Editor';
import ImageViewerPage from './pages/ImageViewer';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { theme, getThemedStyle, isDark } = useTheme();

  React.useEffect(() => {
    const locales = RNLocalize.getLocales();
    if (Array.isArray(locales)) {
      const deviceLanguage = locales[0].languageCode;
      // 如果是中文（任何变体），使用中文，否则使用英文
      const language = deviceLanguage === 'zh' || deviceLanguage.startsWith('zh') ? 'zh' : 'en';
      setLanguage(language);
      i18n.changeLanguage(language);
    }
  }, []);

  // 创建导航主题配置
  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.buttons.primary,
      background: theme.backgrounds.primary,
      card: theme.backgrounds.secondary,
      text: theme.texts.primary,
      border: theme.borders.primary,
      notification: theme.buttons.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: 'normal' as const,
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const,
      },
      light: {
        fontFamily: 'System',
        fontWeight: '300' as const,
      },
      thin: {
        fontFamily: 'System',
        fontWeight: '100' as const,
      },
      bold: {
        fontFamily: 'System',
        fontWeight: 'bold' as const,
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '900' as const,
      },
    }
  };

  const statusBarStyle = getThemedStyle.statusBar();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.backgrounds.primary }}>
      <KeyboardProvider>
        <StatusBar 
          barStyle={statusBarStyle.barStyle}
          backgroundColor={statusBarStyle.backgroundColor}
        />
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={Home}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Search"
              component={Search}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Editor"
              component={EditorPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ImageViewer"
              component={ImageViewerPage}
              options={{ 
                headerShown: false,
                presentation: 'modal',
                gestureEnabled: true,
                animationTypeForReplace: 'pop',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

export default App;

function setLanguage(deviceLanguage: string) {
  // 设置语言逻辑（如果需要额外处理可在此添加）
}

