/**
 * Color utilities for dynamic theming
 * Extracts dominant colors from the page and creates harmonious accent colors
 */

const ColorUtils = {
  /**
   * Convert RGB to HSL
   */
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  },

  /**
   * Convert HSL to RGB
   */
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  },

  /**
   * Parse a color string to RGB
   */
  parseColor(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
      return null;
    }

    // Handle rgb/rgba
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }

    // Handle hex
    const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }

    return null;
  },

  /**
   * Convert RGB to hex string
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  /**
   * Get the background color of the page
   */
  getPageBackgroundColor() {
    const body = document.body;
    const html = document.documentElement;
    
    // Try body background first
    let bgColor = window.getComputedStyle(body).backgroundColor;
    let parsed = this.parseColor(bgColor);
    
    if (!parsed) {
      // Try html element
      bgColor = window.getComputedStyle(html).backgroundColor;
      parsed = this.parseColor(bgColor);
    }
    
    // Default to white if no background found
    return parsed || { r: 255, g: 255, b: 255 };
  },

  /**
   * Determine if a color is dark
   */
  isDark(r, g, b) {
    // Using relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  },

  /**
   * Generate an accent color based on page colors
   */
  generateAccentColor(baseColor) {
    const hsl = this.rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
    
    // Shift hue to create a complementary accent
    let accentHue = (hsl.h + 180) % 360;
    
    // Ensure good saturation and appropriate lightness
    const accentSat = Math.max(50, Math.min(80, hsl.s + 20));
    const accentLight = this.isDark(baseColor.r, baseColor.g, baseColor.b) ? 65 : 45;
    
    const rgb = this.hslToRgb(accentHue, accentSat, accentLight);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  /**
   * Generate theme colors for the sidebar based on page colors
   */
  generateTheme() {
    const pageBg = this.getPageBackgroundColor();
    const pageIsDark = this.isDark(pageBg.r, pageBg.g, pageBg.b);
    
    // Always use dark theme for sidebar but adapt accent
    const theme = {
      // Base colors - always dark
      bgPrimary: '#0d0d0d',
      bgSecondary: '#161616',
      bgTertiary: '#1f1f1f',
      bgHover: '#2a2a2a',
      
      // Text colors
      textPrimary: '#ffffff',
      textSecondary: '#a0a0a0',
      textMuted: '#666666',
      
      // Borders
      border: 'rgba(255, 255, 255, 0.08)',
      borderHover: 'rgba(255, 255, 255, 0.15)',
      
      // Accent - derived from page
      accent: this.generateAccentColor(pageBg),
      
      // Highlight colors
      highlightColors: [
        '#fbbf24', // Yellow
        '#34d399', // Green
        '#60a5fa', // Blue
        '#f472b6', // Pink
        '#a78bfa', // Purple
        '#fb923c', // Orange
      ]
    };
    
    // Adjust accent if page has strong colors
    const pageHsl = this.rgbToHsl(pageBg.r, pageBg.g, pageBg.b);
    if (pageHsl.s > 30) {
      // Page has some saturation, use related accent
      const rgb = this.hslToRgb(pageHsl.h, 60, 55);
      theme.accent = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    return theme;
  },

  /**
   * Apply theme to CSS variables
   */
  applyTheme(theme, container) {
    container.style.setProperty('--sm-bg-primary', theme.bgPrimary);
    container.style.setProperty('--sm-bg-secondary', theme.bgSecondary);
    container.style.setProperty('--sm-bg-tertiary', theme.bgTertiary);
    container.style.setProperty('--sm-bg-hover', theme.bgHover);
    container.style.setProperty('--sm-text-primary', theme.textPrimary);
    container.style.setProperty('--sm-text-secondary', theme.textSecondary);
    container.style.setProperty('--sm-text-muted', theme.textMuted);
    container.style.setProperty('--sm-border', theme.border);
    container.style.setProperty('--sm-border-hover', theme.borderHover);
    container.style.setProperty('--sm-accent', theme.accent);
  }
};

// Make available globally
window.ColorUtils = ColorUtils;
