import React from 'react';

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const,
  hairlineWidth: 1,
};

export const Platform = {
  OS: 'ios' as const,
  select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined => obj.ios ?? obj.default,
};

export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 3, fontScale: 1 });
export const useColorScheme = () => 'light' as const;

export const Keyboard = {
  dismiss: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

function createMockComponent(name: string) {
  const Component = React.forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    return React.createElement(name, { ...props, ref });
  });
  Component.displayName = name;
  return Component;
}

export const View = createMockComponent('View');
export const Text = createMockComponent('Text');
export const TextInput = createMockComponent('TextInput');
export const Pressable = createMockComponent('Pressable');
export const ScrollView = createMockComponent('ScrollView');
export const KeyboardAvoidingView = createMockComponent('KeyboardAvoidingView');
export const TouchableWithoutFeedback = createMockComponent('TouchableWithoutFeedback');
export const ActivityIndicator = createMockComponent('ActivityIndicator');
export const Modal = createMockComponent('Modal');
