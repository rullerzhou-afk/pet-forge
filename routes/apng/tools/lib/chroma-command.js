/**
 * Build the platform-specific chroma-key command.
 *
 * APNG uses 0 for infinite playback and 1 for a single play.
 */
export function buildChromaInvocation({
  platform = process.platform,
  scriptPath,
  videoPath,
  apngPath,
  loop,
  keyColor,
}) {
  const plays = loop ? '0' : '1';
  const args = [scriptPath, videoPath, apngPath, '--plays', plays];
  if (keyColor) args.push('--key-color', keyColor);

  if (platform === 'win32') {
    return {
      command: 'py',
      args: ['-3', ...args],
    };
  }

  return {
    command: 'python3',
    args,
  };
}
