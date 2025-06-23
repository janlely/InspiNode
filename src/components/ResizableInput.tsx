import React, { useState, forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface ResizableInputProps extends Omit<TextInputProps, 'onContentSizeChange'> {
  minHeight?: number;
  maxHeight?: number;
  onHeightChange?: (height: number) => void;
}

export const ResizableInput = forwardRef<TextInput, ResizableInputProps>(
  ({ minHeight = 30, maxHeight = 120, onHeightChange, style, ...props }, ref) => {
    const [height, setHeight] = useState(minHeight);

    const handleContentSizeChange = (event: any) => {
      const { height: contentHeight } = event.nativeEvent.contentSize;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight + 8));
      
      setHeight(newHeight);
      
      // 调用外部传入的回调
      onHeightChange?.(newHeight);
    };

    return (
      <TextInput
        ref={ref}
        multiline
        {...props}
        style={[
          style,
          { height }
        ]}
        onContentSizeChange={handleContentSizeChange}
      />
    );
  }
);

ResizableInput.displayName = 'ResizableInput';

export default ResizableInput; 