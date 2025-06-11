import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  TextInput,
  SafeAreaView,
} from 'react-native';

export default function KeyboardTestPage() {
  const [inputValue, setInputValue] = useState('');
  const [buttonClickCount, setButtonClickCount] = useState(0);

  const handleButtonPress = () => {
    setButtonClickCount(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>键盘焦点测试</Text>
          <Text style={styles.description}>
            测试点击键盘上方的按钮时，TextInput是否会丢失焦点
          </Text>
          
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="请输入内容..."
            multiline
            autoFocus
          />
          
          <Text style={styles.info}>
            按钮点击次数: {buttonClickCount}
          </Text>
        </View>
        
        {/* 键盘上方的按钮 */}
        <View style={styles.keyboardToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleButtonPress}
            // 关键属性：防止按钮点击时TextInput失去焦点
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>测试按钮</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  info: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  keyboardToolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toolbarButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 