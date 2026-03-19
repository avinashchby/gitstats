/** ANSI color utility — avoids ESM/CJS issues with chalk v5. */

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

/** Wrap text in ANSI escape codes. */
function wrap(open: string, close: string) {
  return (s: string): string => `${ESC}${open}m${s}${ESC}${close}m`;
}

export const bold    = wrap('1',  '22');
export const dim     = wrap('2',  '22');
export const red     = wrap('31', '39');
export const green   = wrap('32', '39');
export const yellow  = wrap('33', '39');
export const blue    = wrap('34', '39');
export const magenta = wrap('35', '39');
export const cyan    = wrap('36', '39');
export const white   = wrap('37', '39');
export const gray    = wrap('90', '39');
export const bgGreen = wrap('42', '49');

/** Strip ANSI codes from a string (useful for length calculations). */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Pad a potentially colored string to a visible width. */
export function padEnd(s: string, width: number, char = ' '): string {
  const visible = stripAnsi(s).length;
  const pad = Math.max(0, width - visible);
  return s + char.repeat(pad);
}

export { RESET };
