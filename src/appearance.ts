import { MaytesError, MaytesErrorCode } from './errors.js';
import type { RenderButtonOptions } from './types.js';

export const MIN_BUTTON_HEIGHT = 40;
export const MAX_BUTTON_HEIGHT = 55;
export const MAX_BUTTON_RADIUS = 999;

export interface ButtonAppearance {
  radius?: number;
  height?: number;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function assertAppearance(options: Pick<RenderButtonOptions, 'radius' | 'height'>): ButtonAppearance {
  const { radius, height } = options;
  const appearance: ButtonAppearance = {};
  if (height !== undefined) {
    if (!isWholeNumber(height) || height < MIN_BUTTON_HEIGHT || height > MAX_BUTTON_HEIGHT) {
      throw new MaytesError(
        MaytesErrorCode.Config,
        `renderButton({ height }) must be a whole number of pixels from ${MIN_BUTTON_HEIGHT} to ${MAX_BUTTON_HEIGHT}`,
      );
    }
    appearance.height = height;
  }
  if (radius !== undefined) {
    const maxRadius = height === undefined ? MAX_BUTTON_RADIUS : Math.floor(height / 2);
    if (!isWholeNumber(radius) || radius < 0 || radius > maxRadius) {
      throw new MaytesError(
        MaytesErrorCode.Config,
        `renderButton({ radius }) must be a whole number of pixels from 0 to ${maxRadius}`,
      );
    }
    appearance.radius = radius;
  }
  return appearance;
}

export function applyAppearance(button: HTMLButtonElement, appearance: ButtonAppearance): void {
  if (appearance.radius !== undefined) button.style.setProperty('--maytes-button-radius', `${appearance.radius}px`);
  if (appearance.height !== undefined) {
    button.style.setProperty('--maytes-button-height', `${appearance.height}px`);
    button.classList.add('maytes-checkout-button--sized');
  }
}
