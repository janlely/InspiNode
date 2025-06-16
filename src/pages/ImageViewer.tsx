import React, { useState } from 'react';
import { 
  View, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  StatusBar,
  Platform,
  Text,
  SafeAreaView 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NavigationProps } from '../Types';

type ImageViewerProps = NavigationProps<'ImageViewer'>;

export default function ImageViewer({ navigation, route }: ImageViewerProps) {
  const { t } = useTranslation();
  const { imageUri } = route.params;
  const [hasError, setHasError] = useState(false);

  const handlePress = () => {
    navigation.goBack();
  };

  const handleImageError = () => {
    setHasError(true);
  };

  const renderContent = () => {
    if (hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('errors.imageLoadFailed')}</Text>
          <Text style={styles.errorSubText}>{t('errors.clickToReturn')}</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="contain"
        onError={handleImageError}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000000"
        hidden={Platform.OS === 'android'}
      />
      <TouchableOpacity 
        style={styles.touchableArea}
        onPress={handlePress}
        activeOpacity={1}
      >
        {renderContent()}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  touchableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
  },
}); 