// Security Service for PIN and Biometric Authentication
// Handles local app locking with PIN and biometric authentication

const STORAGE_KEY_PIN = 'lifeos_pin_hash';
const STORAGE_KEY_BIOMETRIC = 'lifeos_biometric_enabled';
const STORAGE_KEY_LOCK_ENABLED = 'lifeos_lock_enabled';
const STORAGE_KEY_LOCK_TIMEOUT = 'lifeos_lock_timeout';
const STORAGE_KEY_LAST_ACTIVE = 'lifeos_last_active';

/**
 * Simple hash function for PIN (not cryptographically secure, but sufficient for local app lock)
 */
async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
    // Check if Web Authentication API is available
    if (!window.PublicKeyCredential) {
        return false;
    }

    try {
        // Check if platform authenticator (biometric) is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch (error) {
        console.error('Error checking biometric availability:', error);
        return false;
    }
}

/**
 * Set up PIN lock
 */
export async function setupPin(pin: string): Promise<boolean> {
    try {
        if (pin.length < 4) {
            throw new Error('PIN must be at least 4 digits');
        }

        const hashedPin = await hashPin(pin);
        localStorage.setItem(STORAGE_KEY_PIN, hashedPin);
        localStorage.setItem(STORAGE_KEY_LOCK_ENABLED, 'true');
        return true;
    } catch (error) {
        console.error('Error setting up PIN:', error);
        return false;
    }
}

/**
 * Verify PIN
 */
export async function verifyPin(pin: string): Promise<boolean> {
    try {
        const storedHash = localStorage.getItem(STORAGE_KEY_PIN);
        if (!storedHash) {
            return false;
        }

        const hashedPin = await hashPin(pin);
        return hashedPin === storedHash;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
}

/**
 * Change PIN
 */
export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
    try {
        const isValid = await verifyPin(oldPin);
        if (!isValid) {
            throw new Error('Current PIN is incorrect');
        }

        if (newPin.length < 4) {
            throw new Error('New PIN must be at least 4 digits');
        }

        const hashedPin = await hashPin(newPin);
        localStorage.setItem(STORAGE_KEY_PIN, hashedPin);
        return true;
    } catch (error) {
        console.error('Error changing PIN:', error);
        return false;
    }
}

/**
 * Remove PIN lock
 */
export function removePin(): void {
    localStorage.removeItem(STORAGE_KEY_PIN);
    localStorage.removeItem(STORAGE_KEY_LOCK_ENABLED);
    localStorage.removeItem(STORAGE_KEY_BIOMETRIC);
}

/**
 * Check if PIN is set
 */
export function isPinSet(): boolean {
    return localStorage.getItem(STORAGE_KEY_PIN) !== null;
}

/**
 * Check if lock is enabled
 */
export function isLockEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEY_LOCK_ENABLED) === 'true';
}

/**
 * Enable/disable biometric authentication
 */
export async function setBiometricEnabled(enabled: boolean): Promise<boolean> {
    try {
        if (enabled) {
            const available = await isBiometricAvailable();
            if (!available) {
                throw new Error('Biometric authentication not available');
            }

            // Test biometric authentication
            const success = await authenticateWithBiometric();
            if (!success) {
                throw new Error('Biometric authentication failed');
            }
        }

        localStorage.setItem(STORAGE_KEY_BIOMETRIC, enabled ? 'true' : 'false');
        return true;
    } catch (error) {
        console.error('Error setting biometric:', error);
        return false;
    }
}

/**
 * Check if biometric is enabled
 */
export function isBiometricEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEY_BIOMETRIC) === 'true';
}

/**
 * Authenticate with biometric
 */
export async function authenticateWithBiometric(): Promise<boolean> {
    try {
        if (!window.PublicKeyCredential) {
            throw new Error('Web Authentication API not available');
        }

        // Create a simple challenge
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        // Request user verification (biometric)
        const publicKeyOptions: PublicKeyCredentialRequestOptions = {
            challenge: challenge,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: []
        };

        const credential = await navigator.credentials.get({
            publicKey: publicKeyOptions
        }) as PublicKeyCredential | null;

        return credential !== null;
    } catch (error) {
        // User cancelled or biometric failed
        console.log('Biometric authentication cancelled or failed:', error);
        return false;
    }
}

/**
 * Set lock timeout (in minutes)
 */
export function setLockTimeout(minutes: number): void {
    localStorage.setItem(STORAGE_KEY_LOCK_TIMEOUT, minutes.toString());
}

/**
 * Get lock timeout (in minutes)
 */
export function getLockTimeout(): number {
    const timeout = localStorage.getItem(STORAGE_KEY_LOCK_TIMEOUT);
    return timeout ? parseInt(timeout, 10) : 5; // Default 5 minutes
}

/**
 * Update last active time
 */
export function updateLastActive(): void {
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
}

/**
 * Check if app should be locked based on timeout
 */
export function shouldLock(): boolean {
    if (!isLockEnabled()) {
        return false;
    }

    const lastActive = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
    if (!lastActive) {
        return true;
    }

    const timeout = getLockTimeout();
    const elapsed = Date.now() - parseInt(lastActive, 10);
    const timeoutMs = timeout * 60 * 1000;

    return elapsed > timeoutMs;
}

/**
 * Lock the app immediately
 */
export function lockApp(): void {
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, '0');
}

