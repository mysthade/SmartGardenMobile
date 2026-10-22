import React, { useMemo } from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PLAN_OBJECT_PRESETS } from '@smart-garden/types';
import { getEffectiveLinePoints } from '@smart-garden/validation';
import type { CanvasPlanObject } from '../../types';

export interface PlanObjectSvgProps {
  object: CanvasPlanObject;
  isSelected: boolean;
  scale: number;
  zoomBucket?: number;
  isDark: boolean;
}

function arePlanObjectPropsEqual(
  prev: PlanObjectSvgProps,
  next: PlanObjectSvgProps,
): boolean {
  if (prev.isDark !== next.isDark) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.zoomBucket !== next.zoomBucket) return false;

  const po = prev.object;
  const no = next.object;

  if (po.id !== no.id) return false;
  if (po.xCm !== no.xCm || po.yCm !== no.yCm) return false;
  if (po.widthCm !== no.widthCm || po.heightCm !== no.heightCm) return false;
  if (po.rotationDeg !== no.rotationDeg) return false;
  if (po.color !== no.color || po.label !== no.label) return false;
  if (po.type !== no.type || po.layer !== no.layer) return false;
  if (po.locked !== no.locked || po.hasCollision !== no.hasCollision) return false;
  if (po.deleted !== no.deleted) return false;
  if (po.meta !== no.meta) {
    if (JSON.stringify(po.meta) !== JSON.stringify(no.meta)) return false;
  }

  return true;
}

export const PlanObjectSvg = React.memo(function PlanObjectSvg({
  object,
  isSelected,
  scale,
  isDark,
}: PlanObjectSvgProps) {
  const preset = PLAN_OBJECT_PRESETS[object.type] ?? PLAN_OBJECT_PRESETS.CUSTOM;
  const isCircle =
    object.type === 'TREE' ||
    object.type === 'BUSH' ||
    object.type === 'WELL' ||
    object.type === 'BOREHOLE';
  const isLine = object.type === 'PATH' || object.type === 'FENCE';

  const color = object.color || preset.defaultColor;

  const cx = object.xCm + object.widthCm / 2;
  const cy = object.yCm + object.heightCm / 2;

  // Linear objects (FENCE / PATH)
  const linePoints = useMemo(() => {
    if (!isLine) return [];
    return getEffectiveLinePoints(object);
  }, [isLine, object]);

  const linePathD = useMemo(() => {
    if (!linePoints.length) return '';
    let d = `M ${linePoints[0]!.xCm} ${linePoints[0]!.yCm}`;
    for (let i = 1; i < linePoints.length; i++) {
      d += ` L ${linePoints[i]!.xCm} ${linePoints[i]!.yCm}`;
    }
    return d;
  }, [linePoints]);

  const strokeWidth = (object.meta?.strokeWidthCm as number) || (object.type === 'PATH' ? 80 : 20);

  // Screen dimension for Level of Detail (LOD) & minimum visual size
  const screenMaxDim = Math.max(object.widthCm, object.heightCm) * scale;
  const minVisualWorldDim = Math.max(object.widthCm, 14 / scale);
  const minVisualWorldHeight = Math.max(object.heightCm, 14 / scale);

  const showIcon = screenMaxDim >= 28;
  const showLabel = screenMaxDim >= 34;
  const fontSize = Math.max(10, Math.min(22, 12 / scale));

  const strokeColor = object.hasCollision
    ? '#ef4444'
    : isSelected
      ? '#10b981'
      : isDark
        ? 'rgba(255, 255, 255, 0.28)'
        : 'rgba(0, 0, 0, 0.22)';

  const strokeW = object.hasCollision ? 3 / scale : isSelected ? 2.5 / scale : 1.2 / scale;

  if (isLine) {
    return (
      <G id={`obj-${object.id}`}>
        <Path
          d={linePathD}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={object.type === 'FENCE' ? '30,15' : undefined}
        />
        {isSelected ? (
          <Path
            d={linePathD}
            stroke="#10b981"
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.5}
          />
        ) : null}
      </G>
    );
  }

  const renderRadius = Math.max(
    Math.min(object.widthCm, object.heightCm) / 2,
    7 / scale,
  );

  return (
    <G
      id={`obj-${object.id}`}
      rotation={object.rotationDeg || 0}
      originX={cx}
      originY={cy}
    >
      {isCircle ? (
        <>
          <Circle
            cx={cx}
            cy={cy}
            r={renderRadius}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          {object.type === 'TREE' && showIcon && (
            <Circle
              cx={cx}
              cy={cy}
              r={renderRadius / 2}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'}
              strokeWidth={1.2 / scale}
            />
          )}
        </>
      ) : (
        <Rect
          x={cx - minVisualWorldDim / 2}
          y={cy - minVisualWorldHeight / 2}
          width={minVisualWorldDim}
          height={minVisualWorldHeight}
          rx={Math.min(16, object.widthCm * 0.08)}
          ry={Math.min(16, object.heightCm * 0.08)}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      )}

      {/* Label with high-contrast pill backdrop (3:1+ contrast) */}
      {showLabel && (
        <G>
          <Rect
            x={cx - (object.label.length * fontSize * 0.32 + 6 / scale)}
            y={cy - fontSize * 0.65}
            width={object.label.length * fontSize * 0.64 + 12 / scale}
            height={fontSize * 1.3}
            rx={3 / scale}
            fill={isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.88)'}
          />
          <SvgText
            x={cx}
            y={cy + fontSize * 0.35}
            fill={isDark ? '#f8fafc' : '#0f172a'}
            fontSize={fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {object.label}
          </SvgText>
        </G>
      )}
    </G>
  );
}, arePlanObjectPropsEqual);
