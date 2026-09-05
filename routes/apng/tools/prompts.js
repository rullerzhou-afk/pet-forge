/**
 * Compatibility shim for APNG tools.
 *
 * The reusable prompt source now lives in ../prompts/template.js.
 * Older tools expect ./prompts.js with buildPrompt(), so keep this tiny bridge.
 */

export {
  CHARACTER_PREFIX,
  DEFAULT_KEY_COLOR,
  BG_SUFFIX,
  normalizeKeyColor,
  buildBackgroundSuffix,
  ANIMATIONS,
  listAnimations,
  buildGenVideoCommand,
} from '../prompts/template.js';

export { buildFullPrompt as buildPrompt } from '../prompts/template.js';
