import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import { useTheme } from '../hooks/useTheme.js';

interface ColorPickerProps {
  visible: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  height?: number;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  visible,
  onClose,
  onColorSelect,
  height,
}) => {
  const { t } = useTranslation();
  // @ts-ignore
  const { theme } = useTheme();
  
  // 预定义的颜色列表
  const COLORS = [
    { name: t('colors.default'), value: '#333333', display: '#333333' },
    { name: t('colors.red'), value: '#ff4444', display: '#ff4444' },
    { name: t('colors.orange'), value: '#ff8800', display: '#ff8800' },
    { name: t('colors.yellow'), value: '#ffcc00', display: '#ffcc00' },
    { name: t('colors.green'), value: '#44aa44', display: '#44aa44' },
    { name: t('colors.blue'), value: '#4488ff', display: '#4488ff' },
    { name: t('colors.purple'), value: '#8844ff', display: '#8844ff' },
    { name: t('colors.pink'), value: '#ff44aa', display: '#ff44aa' },
    { name: t('colors.cyan'), value: '#00cccc', display: '#00cccc' },
    { name: t('colors.darkRed'), value: '#cc0000', display: '#cc0000' },
    { name: t('colors.darkGreen'), value: '#008800', display: '#008800' },
    { name: t('colors.darkBlue'), value: '#0066cc', display: '#0066cc' },
    { name: t('colors.gray'), value: '#888888', display: '#888888' },
    { name: t('colors.darkGray'), value: '#555555', display: '#555555' },
    { name: t('colors.lightGray'), value: '#aaaaaa', display: '#aaaaaa' },
  ];

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <View style={[
      styles.panel, 
      { backgroundColor: theme.backgrounds.secondary },
      height ? { height } : undefined
    ]}>
      {/* 颜色网格 */}
      <ScrollView style={styles.colorGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.colorRow}>
          {COLORS.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.colorItem]}
              onPress={() => handleColorSelect(color.value)}
              activeOpacity={0.7}
            >
              <View 
                style={[
                  styles.colorCircle,
                  { 
                    backgroundColor: color.display,
                    borderColor: theme.borders.secondary
                  }
                ]} 
              />
              <Text style={[
                styles.colorName,
                { color: theme.texts.secondary }
              ]}>
                {color.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    height: 280, // 固定高度，接近键盘高度
  },
  colorGrid: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorItem: {
    width: '18%',
    aspectRatio: 1,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
    borderWidth: 2,
  },
  colorName: {
    fontSize: 12,
    textAlign: 'center',
  },
}); 