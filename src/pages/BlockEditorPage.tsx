import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Block, BlockType, NavigationProps } from '../Types';
import { BlockEditor } from '../components/BlockEditor';
import { KeyboardToolbar } from '../components/KeyboardToolbar';
import { ColorPicker } from '../components/ColorPicker';
import { createNewBlock, blocksToMarkdown } from '../utils/BlockTypeUtils';

// type BlockEditorNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BlockEditor'>;
// type BlockEditorRouteProp = RouteProp<RootStackParamList, 'BlockEditor'>;

type BlockEditorProps = NavigationProps<'BlockEditor'>

// 定义UI状态的枚举
enum UIState {
  NORMAL = 'normal',           // 正常状态：工具栏和颜色选择器都关闭
  KEYBOARD_EDITING = 'keyboard_editing',  // 键盘编辑状态：工具栏显示，颜色选择器隐藏
  COLOR_PICKING = 'color_picking',        // 颜色选择状态：工具栏显示，颜色选择器显示
  }

export default function BlockEditorPage({ navigation, route }: BlockEditorProps) {
  const { ideaId } = route.params || {};

  // 基础状态
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  
  // UI状态管理
  const [uiState, setUIState] = useState<UIState>(UIState.NORMAL);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [colorPickerTopPosition, setColorPickerTopPosition] = useState(0);
  const [toolbarActualPosition, setToolbarActualPosition] = useState(0);
  const toolbarMeasureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<any>(null);
  
  // 测量ColorPicker位置（仅在键盘隐藏时有效）
  const handleColorPickerLayout = useCallback((event: any) => {
    const { y, height } = event.nativeEvent.layout;
    const screenHeight = Dimensions.get('window').height;
    
    // ColorPicker相对于屏幕的底部距离
    const colorPickerBottom = screenHeight - y - height;
    // 工具栏应该在ColorPicker顶部，所以是ColorPicker的高度 + 底部距离
    const toolbarBottom = height + colorPickerBottom;
    
    console.log('🎨 ColorPicker Layout Measurement:', {
      timestamp: new Date().toLocaleTimeString(),
      uiState,
      isKeyboardVisible,
      keyboardHeight,
      measurement: {
        y,
        height,
        screenHeight,
        colorPickerBottom,
        toolbarBottom
      },
      context: isKeyboardVisible ? '(键盘覆盖状态)' : '(键盘退出状态)'
    });
    
    setColorPickerTopPosition(toolbarBottom);
  }, [uiState, isKeyboardVisible, keyboardHeight]);

  // 简化的工具栏layout处理 - 主要用于设置ref
  const handleToolbarLayout = useCallback((event: any) => {
    // 保存工具栏的引用供后续测量使用
    toolbarRef.current = event.target;
    
    console.log('🔧 Toolbar Layout Event:', {
      timestamp: new Date().toLocaleTimeString(),
      uiState,
      isKeyboardVisible,
      context: '保存工具栏引用'
    });
  }, [uiState, isKeyboardVisible]);
  
  // 工具栏状态
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ blockId: string; position: number } | null>(null);
  const [isTextStyleMode, setIsTextStyleMode] = useState(false);
  
  // 标记颜色选择器是否通过工具栏按钮触发
  const [isColorPickerTriggeredByToolbar, setIsColorPickerTriggeredByToolbar] = useState(false);

  useEffect(() => {
    initializeBlocks();
    
    // 键盘显示监听
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('🎹 Keyboard Show Event:', {
        timestamp: new Date().toLocaleTimeString(),
        keyboardHeight: event.endCoordinates.height,
        currentUIState: uiState,
        currentToolbarPosition: toolbarActualPosition,
        willChangeToEditing: uiState === UIState.NORMAL,
        context: 'ColorPicker应该被键盘覆盖，工具栏将被推上来'
      });
      
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      
      // 只有在正常状态下，键盘显示才切换到编辑状态
      if (uiState === UIState.NORMAL) {
        setUIState(UIState.KEYBOARD_EDITING);
      }
      
      // 延迟测量工具栏位置，等待所有动画完成
      if (toolbarMeasureTimeoutRef.current) {
        clearTimeout(toolbarMeasureTimeoutRef.current);
      }
      
      toolbarMeasureTimeoutRef.current = setTimeout(() => {
        if (toolbarRef.current) {
          const screenHeight = Dimensions.get('window').height;
          toolbarRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                         // 计算工具栏距离键盘顶部的距离
             const keyboardTopY = screenHeight - event.endCoordinates.height;
             const toolbarBottomY = y + height;
             const distanceAboveKeyboard = keyboardTopY - toolbarBottomY;
             
             console.log('🔧 Keyboard Event Triggered Toolbar Measurement:', {
               timestamp: new Date().toLocaleTimeString(),
               keyboardHeight: event.endCoordinates.height,
                                measurement: {
                 x, y, width, height,
                 screenHeight,
                 keyboardTopY,
                 toolbarBottomCalculated: toolbarBottomY,
                 distanceAboveKeyboard,
                 directBottomPosition: screenHeight - y,
                 toolbarTopY: y,
                 toolbarBottomY: y + height
               },
               context: '键盘显示后稳定测量 - 显示详细位置信息'
             });
             
             // 直接使用measureInWindow的y值计算距离屏幕底部的位置
             const directBottomPosition = screenHeight - y;
             
             console.log('🔧 Using direct measurement approach:', {
               screenHeight,
               toolbarY: y,
               toolbarHeight: height,
               directBottomPosition,
               simpleCalculation: `${screenHeight} - ${y} = ${directBottomPosition}`
             });
             
             setToolbarActualPosition(directBottomPosition);
          });
        } else {
          console.log('🚨 Toolbar ref not available for measurement');
        }
      }, 500); // 延迟500ms确保所有动画完成
    });
    
    // 键盘隐藏监听
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('🎹 Keyboard Hide Event:', {
        timestamp: new Date().toLocaleTimeString(),
        currentUIState: uiState,
        currentToolbarPosition: toolbarActualPosition,
        isColorPickerTriggered: isColorPickerTriggeredByToolbar,
        willResetState: uiState === UIState.KEYBOARD_EDITING,
        context: 'ColorPicker应该不再被覆盖，工具栏位置可能需要调整'
      });
      
      setIsKeyboardVisible(false);
      
      // 根据当前状态决定下一步操作
      if (uiState === UIState.KEYBOARD_EDITING) {
        // 正常的键盘退出：回到正常状态
        console.log('🔄 Resetting toolbar position on normal keyboard hide');
        setUIState(UIState.NORMAL);
        setKeyboardHeight(0);
        setToolbarActualPosition(0); // 重置工具栏位置
        resetFormatStates();
      } else if (uiState === UIState.COLOR_PICKING && isColorPickerTriggeredByToolbar) {
        // 通过工具栏按钮触发的颜色选择：保持颜色选择状态，但不重置键盘高度
        // 工具栏需要保持在原键盘位置
      }
      
      // 重置触发标记
      setIsColorPickerTriggeredByToolbar(false);
    });
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [uiState, isColorPickerTriggeredByToolbar, toolbarActualPosition]);

  // 调试状态变化
  useEffect(() => {
    console.log('📊 State Change:', {
      timestamp: new Date().toLocaleTimeString(),
      uiState,
      isKeyboardVisible,
      keyboardHeight,
      colorPickerTopPosition,
      toolbarActualPosition,
      isColorPickerTriggeredByToolbar,
      activeBlockId,
      showToolbar: uiState !== UIState.NORMAL,
      showColorPicker: uiState === UIState.COLOR_PICKING,
      expectedToolbarMode: uiState === UIState.KEYBOARD_EDITING ? 'following' : (uiState === UIState.COLOR_PICKING ? 'fixed' : 'none'),
      toolbarPositionMeaning: 'absolute distance from screen bottom',
      context: `UI状态: ${uiState}, 键盘: ${isKeyboardVisible ? '显示' : '隐藏'}`
    });
  }, [uiState, isKeyboardVisible, keyboardHeight, colorPickerTopPosition, toolbarActualPosition, isColorPickerTriggeredByToolbar, activeBlockId]);

  // 初始化blocks
  const initializeBlocks = useCallback(() => {
    const initialBlocks: Block[] = [
      {
        id: '1',
        type: BlockType.PARAGRAPH,
        content: '',
        order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    setBlocks(initialBlocks);
  }, []);

  // 重置格式状态
  const resetFormatStates = useCallback(() => {
    setIsBoldActive(false);
    setIsItalicActive(false);
    setCursorPosition(null);
    setIsTextStyleMode(false);
  }, []);

  // 处理block内容变化
  const handleBlockContentChange = useCallback((blockId: string, content: string) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === blockId
          ? { ...block, content, updated_at: new Date().toISOString() }
          : block
      )
    );
  }, []);

  // 处理block类型变化
  const handleBlockTypeChange = useCallback((blockId: string, type: BlockType) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === blockId
          ? { ...block, type, updated_at: new Date().toISOString() }
          : block
      )
    );
  }, []);

  // 处理添加新block
  const handleAddBlock = useCallback((afterBlockId: string) => {
    const newBlock = createNewBlock(BlockType.PARAGRAPH);
    const afterBlock = blocks.find(b => b.id === afterBlockId);
    if (afterBlock) {
      newBlock.order = afterBlock.order + 1;
      setBlocks(prevBlocks => {
        const updatedBlocks = prevBlocks.map(block =>
          block.order > afterBlock.order
            ? { ...block, order: block.order + 1 }
            : block
        );
        return [...updatedBlocks, newBlock];
      });
    }
  }, [blocks]);

  // 处理block获得焦点
  const handleBlockFocus = useCallback((blockId: string) => {
    console.log('🎯 Block focus:', blockId);
    setActiveBlockId(blockId);
    
    // 如果当前是颜色选择状态，且不是通过工具栏触发的，则切回编辑状态
    if (uiState === UIState.COLOR_PICKING && !isColorPickerTriggeredByToolbar) {
      setUIState(UIState.KEYBOARD_EDITING);
    }
  }, [uiState, isColorPickerTriggeredByToolbar]);

  // 处理block失焦
  const handleBlockBlur = useCallback((blockId: string) => {
    // 不自动清除activeBlockId，让用户手动管理焦点
  }, []);

  // 处理回车键
  const handleEnterPress = useCallback((blockId: string) => {
    handleAddBlock(blockId);
  }, [handleAddBlock]);

  // 处理点击空白区域
  const handleEmptyAreaPress = useCallback(() => {
    // 如果是颜色选择状态，点击空白区域关闭颜色选择器
    if (uiState === UIState.COLOR_PICKING) {
      setUIState(UIState.NORMAL);
      setActiveBlockId(null);
    }
  }, [uiState]);

  // 保存blocks
  const saveBlocks = useCallback(() => {
    Alert.alert('保存成功', '内容已保存');
  }, []);

  // 切换预览模式
  const togglePreviewMode = useCallback(() => {
    if (!isPreviewMode) {
      const markdown = blocksToMarkdown(blocks);
      setMarkdownContent(markdown);
    }
    setIsPreviewMode(!isPreviewMode);
    
    // 切换到预览模式时，重置UI状态
    if (!isPreviewMode) {
      setUIState(UIState.NORMAL);
      setActiveBlockId(null);
    }
  }, [isPreviewMode, blocks]);

  // 获取当前活跃block的类型
  const getCurrentBlockType = useCallback((): BlockType => {
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    return activeBlock?.type || BlockType.PARAGRAPH;
  }, [blocks, activeBlockId]);

  // 处理工具栏中的block类型更改
  const handleToolbarBlockTypeChange = useCallback((type: BlockType) => {
    if (activeBlockId) {
      const activeBlock = blocks.find(b => b.id === activeBlockId);
      if (activeBlock) {
        let newContent = activeBlock.content;
        
        // 移除现有的markdown标记
        newContent = newContent.replace(/^#{1,6}\s*/, '');
        
        // 添加新的markdown标记
        if (type === BlockType.H1) {
          newContent = '# ' + newContent;
        } else if (type === BlockType.H2) {
          newContent = '## ' + newContent;
        } else if (type === BlockType.H3) {
          newContent = '### ' + newContent;
        }
        
        handleBlockContentChange(activeBlockId, newContent);
      }
      handleBlockTypeChange(activeBlockId, type);
    }
  }, [activeBlockId, blocks, handleBlockContentChange, handleBlockTypeChange]);

  // 处理取消格式
  const handleCancelFormat = useCallback((block: Block, marker: string, markerLength: number) => {
    const content = block.content;
    const cursorPos = cursorPosition?.blockId === block.id ? cursorPosition.position : content.length;
    
    // 检查光标前后是否有对应的标记
    const beforeCursor = content.substring(0, cursorPos);
    const afterCursor = content.substring(cursorPos);
    
    // 查找最近的标记对
    const beforeMarkerIndex = beforeCursor.lastIndexOf(marker);
    const afterMarkerIndex = afterCursor.indexOf(marker);
    
    if (beforeMarkerIndex !== -1 && afterMarkerIndex !== -1) {
      // 找到了完整的标记对，删除它们
      const newContent = 
        content.substring(0, beforeMarkerIndex) +
        content.substring(beforeMarkerIndex + markerLength, cursorPos) +
        content.substring(cursorPos, cursorPos + afterMarkerIndex) +
        content.substring(cursorPos + afterMarkerIndex + markerLength);
      
      handleBlockContentChange(block.id, newContent);
      
      // 调整光标位置
      const newCursorPos = cursorPos - markerLength;
      setTimeout(() => {
        setCursorPosition({ blockId: block.id, position: newCursorPos });
      }, 10);
    }
  }, [cursorPosition, handleBlockContentChange]);

  // 处理文本格式化
  const handleFormatText = useCallback((format: string) => {
    console.log('🎨 Format text:', format, 'activeBlockId:', activeBlockId);
    
    if (!activeBlockId) return;
    
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    if (!activeBlock) return;
    
    if (format === 'bold_cancel') {
      handleCancelFormat(activeBlock, '**', 2);
    } else if (format === 'italic_cancel') {
      handleCancelFormat(activeBlock, '*', 1);
    } else if (format === 'show_color_picker') {
      console.log('🎨 Color Picker Button Clicked:', {
        timestamp: new Date().toLocaleTimeString(),
        currentState: uiState,
        isKeyboardVisible,
        keyboardHeight,
        colorPickerTopPosition,
        toolbarActualPosition,
        action: uiState === UIState.COLOR_PICKING ? '关闭颜色选择器' : '打开颜色选择器'
      });
      
      if (uiState === UIState.COLOR_PICKING) {
        // 关闭颜色选择器，恢复到键盘编辑状态
        setUIState(UIState.KEYBOARD_EDITING);
        
        // 重新聚焦到活跃的输入框
        if (activeBlockId) {
          setTimeout(() => {
            handleBlockFocus(activeBlockId);
          }, 100);
        }
      } else {
        // 打开颜色选择器
        // 必须在文本样式模式下才能看到颜色按钮，所以这里应该已经是文本样式模式
        // 但为了确保状态一致，我们显式设置
        setIsTextStyleMode(true);
        
        setIsColorPickerTriggeredByToolbar(true);
        
        // 使用测量到的工具栏绝对位置
        if (toolbarActualPosition > 0) {
          // toolbarActualPosition现在是工具栏的绝对位置（距离屏幕底部）
          console.log('🔧 Using absolute toolbar position:', {
            absoluteToolbarPosition: toolbarActualPosition,
            originalColorPickerPosition: colorPickerTopPosition
          });
          setColorPickerTopPosition(toolbarActualPosition);
        }
        
        setUIState(UIState.COLOR_PICKING);
        
        console.log('🎨 About to dismiss keyboard for color picker');
        // 主动收起键盘
        Keyboard.dismiss();
      }
    }
  }, [activeBlockId, blocks, uiState, toolbarActualPosition, handleCancelFormat, handleBlockFocus]);

  // 处理插入文本
  const handleInsertText = useCallback((text: string) => {
    console.log('🔧 handleInsertText called:', { text, activeBlockId });
    
    if (activeBlockId) {
      const activeBlock = blocks.find(b => b.id === activeBlockId);
      if (activeBlock) {
        let newContent;
        let cursorPosition = activeBlock.content.length;
        
        if (text === '****') {
          newContent = activeBlock.content + '****';
          cursorPosition = newContent.length - 2;
        } else if (text === '**') {
          newContent = activeBlock.content + '**';
          cursorPosition = newContent.length - 1;
        } else if (text === '$$$$') {
          newContent = activeBlock.content + '$$$$';
          cursorPosition = newContent.length - 2;
        } else {
          newContent = activeBlock.content + text;
          cursorPosition = newContent.length;
        }
        
        handleBlockContentChange(activeBlockId, newContent);
        
        setTimeout(() => {
          setCursorPosition({ blockId: activeBlockId, position: cursorPosition });
        }, 10);
      }
    }
  }, [activeBlockId, blocks, handleBlockContentChange]);

  // 处理格式状态变化
  const handleFormatStateChange = useCallback((format: 'bold' | 'italic', isActive: boolean) => {
    if (format === 'bold') {
      setIsBoldActive(isActive);
    } else if (format === 'italic') {
      setIsItalicActive(isActive);
    }
  }, []);



  // 处理颜色选择
  const handleColorSelect = useCallback((color: string) => {
    console.log('🎨 Color selected:', color, 'activeBlockId:', activeBlockId);
    
    if (!activeBlockId) return;
    
    const activeBlock = blocks.find(b => b.id === activeBlockId);
    if (!activeBlock) return;
    
    const colorStart = `<color:${color}>`;
    const colorEnd = '</color>';
    const colorPattern = colorStart + colorEnd;
    
    const newContent = activeBlock.content + colorPattern;
    handleBlockContentChange(activeBlockId, newContent);
    
    const cursorPos = activeBlock.content.length + colorStart.length;
    setTimeout(() => {
      setCursorPosition({ blockId: activeBlockId, position: cursorPos });
    }, 10);
    
    // 颜色选择后，回到键盘编辑状态，并保持文本样式模式
    setUIState(UIState.KEYBOARD_EDITING);
    // 保持文本样式模式，以便用户继续进行格式化操作
    setIsTextStyleMode(true);
    
    // 延迟聚焦，让颜色选择器先关闭
    setTimeout(() => {
      if (activeBlockId) {
        handleBlockFocus(activeBlockId);
      }
    }, 200);
  }, [activeBlockId, blocks, handleBlockContentChange, handleBlockFocus]);

  // 简单的markdown渲染函数
  const renderMarkdownText = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={markdownStyles.h1}>
            {line.replace('# ', '')}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        return (
          <Text key={index} style={markdownStyles.h2}>
            {line.replace('## ', '')}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        return (
          <Text key={index} style={markdownStyles.h3}>
            {line.replace('### ', '')}
          </Text>
        );
      } else {
        return (
          <Text key={index} style={markdownStyles.paragraph}>
            {line}
          </Text>
        );
      }
    });
  };

  // 渲染编辑模式
  const renderEditMode = () => (
    <TouchableOpacity
      style={styles.scrollView}
      activeOpacity={1}
      onPress={handleEmptyAreaPress}
    >
      <View style={styles.content}>
        {blocks
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onContentChange={handleBlockContentChange}
              onAddBlock={handleAddBlock}
              onFocus={handleBlockFocus}
              onBlur={handleBlockBlur}
              onEnterPress={handleEnterPress}
              isActive={activeBlockId === block.id}
              cursorPosition={cursorPosition?.blockId === block.id ? cursorPosition.position : undefined}
              onCursorPositionSet={() => setCursorPosition(null)}
            />
          ))}
        
        <View style={styles.emptyArea} />
      </View>
    </TouchableOpacity>
  );

  // 渲染预览模式
  const renderPreviewMode = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.previewContent}>
        {markdownContent ? (
          <View>
            {renderMarkdownText(markdownContent)}
          </View>
        ) : (
          <Text style={styles.emptyPreview}>暂无内容</Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {isPreviewMode ? '预览模式' : '编辑模式'}
        </Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={togglePreviewMode}
          >
            <Text style={styles.headerButtonText}>
              {isPreviewMode ? '✏️' : '👁️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={saveBlocks}
          >
            <Text style={styles.headerButtonText}>💾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 键盘避让视图 */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={uiState === UIState.KEYBOARD_EDITING} // 只在键盘编辑状态下启用避让
      >
        {/* 内容区域 */}
        {isPreviewMode ? renderPreviewMode() : renderEditMode()}

        {/* 键盘工具栏 - 跟随键盘模式 */}
        {uiState === UIState.KEYBOARD_EDITING && !isPreviewMode && (() => {
          console.log('🛠️ Rendering Following Toolbar:', {
            timestamp: new Date().toLocaleTimeString(),
            uiState,
            isKeyboardVisible,
            keyboardHeight,
            currentToolbarPosition: toolbarActualPosition,
            context: '跟随键盘的工具栏开始渲染'
          });
          return (
            <View style={styles.keyboardToolbarFollowing} onLayout={handleToolbarLayout}>
              <KeyboardToolbar
                currentBlockType={getCurrentBlockType()}
                onBlockTypeChange={handleToolbarBlockTypeChange}
                onFormatText={handleFormatText}
                onInsertText={handleInsertText}
                onFormatStateChange={handleFormatStateChange}
                isTextStyleMode={isTextStyleMode}
                onTextStyleModeChange={setIsTextStyleMode}
              />
            </View>
          );
        })()}
      </KeyboardAvoidingView>
      
      {/* 键盘工具栏 - 固定位置模式（颜色选择状态） */}
      {uiState === UIState.COLOR_PICKING && !isPreviewMode && colorPickerTopPosition > 0 && (() => {
        console.log('🔧 Rendering Fixed Toolbar:', {
          timestamp: new Date().toLocaleTimeString(),
          uiState,
          isKeyboardVisible,
          keyboardHeight,
          colorPickerTopPosition,
          toolbarActualPosition,
          context: `固定位置工具栏渲染，bottom: ${colorPickerTopPosition}`
        });
        return (
          <View style={[styles.keyboardToolbarFixed, { bottom: colorPickerTopPosition }]}>
            <KeyboardToolbar
              currentBlockType={getCurrentBlockType()}
              onBlockTypeChange={handleToolbarBlockTypeChange}
              onFormatText={handleFormatText}
              onInsertText={handleInsertText}
              onFormatStateChange={handleFormatStateChange}
              isTextStyleMode={isTextStyleMode}
              onTextStyleModeChange={setIsTextStyleMode}
            />
          </View>
        );
      })()}
      
      {/* 颜色选择器 - 始终渲染用于位置测量 */}
      <View 
        style={[
          styles.colorPickerContainer, 
          { height: 280 },
          uiState !== UIState.COLOR_PICKING && { opacity: 0, pointerEvents: 'none' }
        ]}
        onLayout={handleColorPickerLayout}
      >
        <ColorPicker
          visible={uiState === UIState.COLOR_PICKING}
          onClose={() => setUIState(UIState.KEYBOARD_EDITING)}
          onColorSelect={handleColorSelect}
          height={280}
        />
      </View>
    </View>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    minHeight: '100%',
  },
  previewContent: {
    padding: 20,
  },
  emptyPreview: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 50,
  },
  emptyArea: {
    flex: 1,
    minHeight: 200,
  },
  keyboardToolbarFollowing: {
    // 跟随键盘模式：让KeyboardAvoidingView自动处理位置
    backgroundColor: '#f8f9fa',
    zIndex: 10,
  },
  keyboardToolbarFixed: {
    // 固定位置模式：固定在指定位置
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 10,
  },
  colorPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});

const markdownStyles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
}); 