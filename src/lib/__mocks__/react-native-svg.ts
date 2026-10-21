import React from 'react';

function createSvgMock(name: string) {
  const Component = (props: Record<string, unknown>) => React.createElement(name, props);
  Component.displayName = name;
  return Component;
}

const Svg = createSvgMock('Svg');
export default Svg;

export const Circle = createSvgMock('Circle');
export const Path = createSvgMock('Path');
export const Rect = createSvgMock('Rect');
export const Line = createSvgMock('Line');
export const Defs = createSvgMock('Defs');
export const Stop = createSvgMock('Stop');
export const LinearGradient = createSvgMock('LinearGradient');
