import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '../Types';

interface ImageBlockProps {
  uri: string;
  onDelete: () => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({ uri, onDelete }) => {
  const navigation = useNavigation<NavigationProps<'Editor'>['navigation']>();
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 屏幕限制
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = screenWidth - 32; // 减去左右边距
  const maxHeight = 300;

  useEffect(() => {
    loadImageDimensions();
  }, [uri]);

  const loadImageDimensions = () => {
    setIsLoading(true);
    setHasError(false);

    Image.getSize(
      uri,
      (width, height) => {
        console.log('📏 图片原始尺寸:', { width, height });
        
        // 计算最佳显示尺寸
        const displayDimensions = calculateDisplayDimensions(width, height);
        console.log('📐 计算显示尺寸:', displayDimensions);
        
        setImageDimensions(displayDimensions);
        setIsLoading(false);
      },
      (error) => {
        console.error('❌ 获取图片尺寸失败:', error);
        setHasError(true);
        setIsLoading(false);
        
        // 设置默认尺寸作为备选
        setImageDimensions({
          width: Math.min(300, maxWidth),
          height: 200
        });
      }
    );
  };

  const calculateDisplayDimensions = (originalWidth: number, originalHeight: number): ImageDimensions => {
    // 如果图片很小，保持原始尺寸
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // 计算缩放比例
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    
    // 使用较小的比例，确保图片完全适合限制
    const scale = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale)
    };
  };

  const handleImagePress = () => {
    navigation.navigate('ImageViewer', { imageUri: uri });
  };

  const renderImage = () => {
    if (isLoading) {
      return (
        <View style={[styles.placeholder, { width: maxWidth, height: 200 }]}>
          <Text style={styles.placeholderText}>加载中...</Text>
        </View>
      );
    }

    if (hasError || !imageDimensions) {
      return (
        <View style={[styles.placeholder, { width: maxWidth, height: 200 }]}>
          <Text style={styles.placeholderText}>图片加载失败</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={handleImagePress} activeOpacity={0.9}>
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: imageDimensions.width,
              height: imageDimensions.height,
            }
          ]}
          resizeMode="contain"
          onError={() => {
            console.error('❌ 图片渲染失败');
            setHasError(true);
          }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        {renderImage()}
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  imageWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 14,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
}); 