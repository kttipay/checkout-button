import { Maytes } from './maytes.js';

if (typeof window !== 'undefined') {
  (window as unknown as { Maytes: typeof Maytes }).Maytes = Maytes;
}

export { Maytes };
export { MaytesError, MaytesErrorCode } from './errors.js';
export type { MaytesErrorCodeValue } from './errors.js';
export type {
  CheckoutClosedDetail,
  CheckoutEventDetail,
  CheckoutFailedDetail,
  CheckoutFailedReason,
  CheckoutOpenedDetail,
  CheckoutRedirectedDetail,
  CheckoutUrlOptions,
  CreateCheckoutFn,
  LaunchSource,
  MaytesEnvironment,
  MaytesFactory,
  MaytesInternalOptions,
  MaytesOptions,
  MaytesSDK,
  OpenCheckoutOptions,
  OpenCheckoutResult,
  RedirectOptions,
  RedirectTarget,
  RenderButtonCleanup,
  RenderButtonMode,
  RenderButtonOptions,
} from './types.js';
export { SDK_VERSION } from './version.js';
