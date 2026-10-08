import { useContext, useEffect, useRef } from 'react';
import type { RenderButtonOptions } from '@maytes/checkout-button';
import { MaytesContext } from './MaytesProvider.js';
import { listenToInstanceEvents, type MaytesEventHandlers } from './events.js';

type ButtonAppearance = Pick<RenderButtonOptions, 'mode' | 'label' | 'block' | 'radius' | 'height' | 'redirectOverlay'>;

type AppearanceValues = { [K in keyof ButtonAppearance]-?: ButtonAppearance[K] | undefined };

export type MaytesButtonProps = ButtonAppearance & MaytesEventHandlers & { className?: string };

function renderOptions({ mode, label, block, radius, height, redirectOverlay }: AppearanceValues): RenderButtonOptions {
  const options: RenderButtonOptions = {};
  if (mode !== undefined) options.mode = mode;
  if (label !== undefined) options.label = label;
  if (block !== undefined) options.block = block;
  if (radius !== undefined) options.radius = radius;
  if (height !== undefined) options.height = height;
  if (redirectOverlay !== undefined) options.redirectOverlay = redirectOverlay;
  return options;
}

export function MaytesButton({ mode, label, block, radius, height, redirectOverlay, className, onOpened, onClosed, onRedirected, onFailed }: MaytesButtonProps) {
  const context = useContext(MaytesContext);
  if (context === null) throw new Error('<MaytesButton> must be used inside <MaytesProvider>.');
  const { maytes } = context;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef<MaytesEventHandlers>({});

  useEffect(() => {
    const handlers: MaytesEventHandlers = {};
    if (onOpened !== undefined) handlers.onOpened = onOpened;
    if (onClosed !== undefined) handlers.onClosed = onClosed;
    if (onRedirected !== undefined) handlers.onRedirected = onRedirected;
    if (onFailed !== undefined) handlers.onFailed = onFailed;
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (maytes === null || container === null) return undefined;
    return maytes.renderButton(container, renderOptions({ mode, label, block, radius, height, redirectOverlay }));
  }, [maytes, mode, label, block, radius, height, redirectOverlay]);

  useEffect(() => {
    if (maytes === null) return undefined;
    return listenToInstanceEvents(document, maytes.instanceId, 'button', () => handlersRef.current);
  }, [maytes]);

  return <div ref={containerRef} className={className} />;
}
