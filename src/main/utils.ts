import { app } from 'electron';
import * as path from 'path';

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

/**
 * Get the correct path to an icon file, handling both development and production environments
 * @param filename - Name of the icon file (default: 'logo1.png')
 * @returns Absolute path to the icon file
 */
export function getIconPath(filename: string = 'logo1.png'): string {
  const isDevMode = isDev();

  if (isDevMode) {
    // Development: icon is in src/public/ relative to project root
    // In dev mode, __dirname is dist/main, so go up two levels to reach project root
    const devPath = path.join(__dirname, '..', '..', 'src', 'public', filename);
    return devPath;
  } else {
    // Production: icon is packaged with the app
    return path.join(__dirname, '..', '..', 'src', 'public', filename);
  }
}