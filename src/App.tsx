import * as React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as RNLocalize from 'react-native-localize';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import i18n from './i18n';
import { RootStackParamList } from './Types';
import Home from './pages/Home';
import Search from './pages/Search';
// import BlockEditorPage from './pages/BlockEditorPage';
import KeyboardTestPage from './pages/KeyboardTestPage';
import EditorPage from './pages/Editor';
import ImageViewerPage from './pages/ImageViewer';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const scheme = useColorScheme();

  React.useEffect(() => {
    const locales = RNLocalize.getLocales();
    if (Array.isArray(locales)) {
      const deviceLanguage = locales[0].languageCode;
      // 如果是中文（任何变体），使用中文，否则使用英文
      const language = deviceLanguage === 'zh' || deviceLanguage.startsWith('zh') ? 'zh' : 'en';
      setLanguage(language);
      i18n.changeLanguage('en');
    }
  }, []);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
function setLanguage(deviceLanguage: string) {
  // 设置语言逻辑（如果需要额外处理可在此添加）
}

