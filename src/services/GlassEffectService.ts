/**
 * GlassEffectService
 *
 * Manages native macOS glass effects using electron-liquid-glass.
 * Only functional on macOS 26+ (Tahoe or later).
 * Provides no-op fallbacks for other platforms.
 */

import liquidGlass from 'electron-liquid-glass';
import type { BrowserWindow } from 'electron';

export interface GlassEffectOptions {
  cornerRadius?: number;
  tintColor?: string;
}

export class GlassEffectService {
  private glassViewId: number | null = null;
  private window: BrowserWindow | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Service initializes but doesn't apply effect until explicitly called
  }

  /**
   * Check if the current platform supports glass effects
   */
  public static isSupported(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Apply glass effect to the given window
   * @param window - The BrowserWindow to apply the effect to
   * @param options - Configuration options for the glass effect
   * @returns The glass view ID if successful, null otherwise
   */
  public applyEffect(
    window: BrowserWindow,
    options: GlassEffectOptions = {}
  ): number | null {
    // Only apply on macOS
    if (!GlassEffectService.isSupported()) {
      console.log('🪟 Glass effect not supported on this platform');
      return null;
    }

    try {
      // Remove existing effect if present
      if (this.glassViewId) {
        this.removeEffect();
      }

      // Store window reference
      this.window = window;

      // Default options
      const effectOptions = {
        cornerRadius: options.cornerRadius ?? 16,
        tintColor: options.tintColor ?? '#44000010',
      };

      // Apply the glass effect
      this.glassViewId = liquidGlass.addView(
        window.getNativeWindowHandle(),
        effectOptions
      );

      this.isEnabled = true;

      console.log(
        `✨ Glass effect applied with ID: ${this.glassViewId}`,
        effectOptions
      );

      return this.glassViewId;
    } catch (error) {
      console.error('❌ Failed to apply glass effect:', error);
      this.glassViewId = null;
      this.isEnabled = false;
      return null;
    }
  }

  /**
   * Remove the currently applied glass effect
   */
  public removeEffect(): void {
    if (!this.glassViewId || !GlassEffectService.isSupported()) {
      return;
    }

    try {
      // Note: electron-liquid-glass doesn't provide a remove method in the docs
      // The effect is typically tied to the window lifecycle
      // When the window is destroyed, the glass effect is automatically removed
      console.log(`🗑️  Glass effect cleanup initiated for ID: ${this.glassViewId}`);

      this.glassViewId = null;
      this.isEnabled = false;
      this.window = null;
    } catch (error) {
      console.error('❌ Failed to remove glass effect:', error);
    }
  }

  /**
   * Update glass effect options
   * Note: This requires removing and re-applying the effect
   * @param options - New configuration options
   */
  public updateEffect(options: GlassEffectOptions): boolean {
    if (!this.window || !GlassEffectService.isSupported()) {
      return false;
    }

    try {
      // Re-apply with new options
      const result = this.applyEffect(this.window, options);
      return result !== null;
    } catch (error) {
      console.error('❌ Failed to update glass effect:', error);
      return false;
    }
  }

  /**
   * Check if glass effect is currently enabled
   */
  public isEffectEnabled(): boolean {
    return this.isEnabled && this.glassViewId !== null;
  }

  /**
   * Get the current glass view ID
   */
  public getGlassViewId(): number | null {
    return this.glassViewId;
  }

  /**
   * Get the window associated with this service
   */
  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Clean up resources when the service is no longer needed
   */
  public cleanup(): void {
    this.removeEffect();
    this.window = null;
  }
}
