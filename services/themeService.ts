// Theme Service - Manages dark/light mode switching

export type ThemeMode = 'light' | 'dark';

// Modern vibrant color palettes
const themes = {
    dark: {
        // Backgrounds - Deep, rich dark tones
        'primary': '#0F172A',           // Slate 900 - Main background
        'secondary': '#1E293B',         // Slate 800 - Card background
        'tertiary': '#334155',          // Slate 700 - Borders, dividers
        
        // Accent colors - Vibrant and modern
        'accent': '#3B82F6',            // Blue 500 - Primary accent
        'accent-hover': '#2563EB',      // Blue 600 - Hover state
        'accent-light': '#60A5FA',      // Blue 400 - Light variant
        
        // Secondary accents
        'success': '#10B981',           // Emerald 500
        'warning': '#F59E0B',           // Amber 500
        'error': '#EF4444',             // Red 500
        'info': '#06B6D4',              // Cyan 500
        'purple': '#A855F7',            // Purple 500
        
        // Text colors - High contrast for readability
        'text-primary': '#F1F5F9',      // Slate 100 - Main text
        'text-secondary': '#CBD5E1',    // Slate 300 - Secondary text
        'text-muted': '#94A3B8',        // Slate 400 - Muted text
        
        // Gradients
        'gradient-start': '#3B82F6',    // Blue
        'gradient-end': '#8B5CF6',      // Purple
    },
    light: {
        // Backgrounds - Clean, bright tones
        'primary': '#FFFFFF',           // White - Main background
        'secondary': '#F8FAFC',         // Slate 50 - Card background
        'tertiary': '#E2E8F0',          // Slate 200 - Borders, dividers
        
        // Accent colors - Vibrant and modern
        'accent': '#3B82F6',            // Blue 500 - Primary accent
        'accent-hover': '#2563EB',      // Blue 600 - Hover state
        'accent-light': '#DBEAFE',      // Blue 100 - Light variant
        
        // Secondary accents
        'success': '#10B981',           // Emerald 500
        'warning': '#F59E0B',           // Amber 500
        'error': '#EF4444',             // Red 500
        'info': '#06B6D4',              // Cyan 500
        'purple': '#A855F7',            // Purple 500
        
        // Text colors - High contrast for readability
        'text-primary': '#0F172A',      // Slate 900 - Main text
        'text-secondary': '#475569',    // Slate 600 - Secondary text
        'text-muted': '#64748B',        // Slate 500 - Muted text
        
        // Gradients
        'gradient-start': '#3B82F6',    // Blue
        'gradient-end': '#8B5CF6',      // Purple
    }
};

/**
 * Get current theme mode from localStorage
 */
export function getThemeMode(): ThemeMode {
    const stored = localStorage.getItem('themeMode');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
}

/**
 * Set theme mode and apply colors
 */
export function setThemeMode(mode: ThemeMode): void {
    localStorage.setItem('themeMode', mode);
    applyTheme(mode);
}

/**
 * Apply theme colors to document
 */
export function applyTheme(mode: ThemeMode): void {
    const colors = themes[mode];
    const root = document.documentElement;
    
    // Apply each color as a CSS variable
    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
    });
    
    // Update Tailwind config dynamically
    if (window.tailwind) {
        window.tailwind.config = {
            theme: {
                extend: {
                    colors: colors
                }
            }
        };
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colors.accent);
    }
    
    // Add/remove dark class on html element for compatibility
    if (mode === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    console.log(`Theme applied: ${mode}`);
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
    const mode = getThemeMode();
    applyTheme(mode);
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): ThemeMode {
    const currentMode = getThemeMode();
    const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    return newMode;
}

// TypeScript declaration for window.tailwind
declare global {
    interface Window {
        tailwind?: {
            config: any;
        };
    }
}

