const STORAGE_KEY = 'apex.mobile.passkey';

export type StoredPasskey = {
  id: string;
  name: string;
  createdAt: number;
};

const toBase64Url = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

export const passkeySupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof window.PublicKeyCredential !== 'undefined' &&
  !!navigator.credentials;

export function readPasskey(): StoredPasskey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPasskey;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function forgetPasskey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

const savePasskey = (passkey: StoredPasskey) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passkey));
  } catch {
    // the passkey still works for this session even without persistence
  }
};

export async function createPasskey(name: string): Promise<StoredPasskey> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Apex Finance', id: location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: name || 'apex-demo',
        displayName: name || 'Apex demo user',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new DOMException('Passkey creation was cancelled', 'NotAllowedError');

  const stored: StoredPasskey = {
    id: toBase64Url(credential.rawId),
    name: name || 'Apex demo user',
    createdAt: Date.now(),
  };
  savePasskey(stored);
  return stored;
}

export async function verifyPasskey(): Promise<void> {
  const stored = readPasskey();
  if (!stored) throw new DOMException('No passkey saved on this device', 'NotAllowedError');

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(stored.id) }],
      userVerification: 'preferred',
      timeout: 60000,
    },
  });

  if (!assertion) throw new DOMException('Passkey sign-in was cancelled', 'NotAllowedError');
}

export function passkeyErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError') return 'Passkey prompt was cancelled. You can try again or use your phone number.';
  if (name === 'SecurityError') return 'Passkeys need a secure connection. Open Apex on HTTPS or localhost.';
  if (name === 'InvalidStateError') return 'This device already has an Apex passkey. Try signing in with it.';
  return 'That passkey did not work. Use your phone number instead.';
}
