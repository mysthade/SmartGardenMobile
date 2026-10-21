import React from 'react';

function createIconMock(name: string) {
  const Icon = (props: Record<string, unknown>) => React.createElement(`Icon-${name}`, props);
  Icon.displayName = name;
  return Icon;
}

export const Settings = createIconMock('Settings');
export const User = createIconMock('User');
export const Mail = createIconMock('Mail');
export const Lock = createIconMock('Lock');
export const ArrowLeft = createIconMock('ArrowLeft');
export const Sun = createIconMock('Sun');
export const Moon = createIconMock('Moon');
export const Check = createIconMock('Check');
export const X = createIconMock('X');
