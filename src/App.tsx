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

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const scheme = useColorScheme();

  React.useEffect(() => {
    const locales = RNLocalize.getLocales();
    if (Array.isArray(locales)) {
      const deviceLanguage = locales[0].languageCode;
      setLanguage(deviceLanguage);
      i18n.changeLanguage(deviceLanguage);
    }
  }, []);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack.Navigator>
            {/* <Stack.Screen
              name="KeyboardTest"
              component={KeyboardTestPage}
              options={{ headerShown: false }}
            /> */}
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
            {/* <Stack.Screen
              name="BlockEditor"
              component={BlockEditorPage}
              options={{ headerShown: false }}
            /> */}
            <Stack.Screen
              name="Editor"
              component={EditorPage}
              options={{ headerShown: false }}
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

