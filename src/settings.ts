export type Cloak = { label: string; title: string; icon: string };

export const CLOAKS: Record<string, Cloak> = {
  google: { label: 'Google', title: 'Google', icon: 'https://www.google.com/favicon.ico' },
  docs: {
    label: 'Google Docs',
    title: 'Google Docs',
    icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
  },
  classroom: {
    label: 'Google Classroom',
    title: 'Google Classroom',
    icon: 'https://ssl.gstatic.com/classroom/favicon.png',
  },
  canvas: {
    label: 'Canvas',
    title: 'Dashboard',
    icon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico',
  },
  drive: {
    label: 'Google Drive',
    title: 'Google Drive',
    icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png',
  },
};

const CLOAK_KEY = 'tabCloak';
const PANIC_KEY = 'panicKey';
const PANIC_URL = 'panicUrl';

function read(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function write(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

let captured = false;
let defaultTitle = '';
let defaultIcon = '';
let defaultType: string | null = null;
let capture: ((key: string) => void) | null = null;

function captureDefaults() {
  if (captured) return;
  captured = true;
  defaultTitle = document.title;
  const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  defaultIcon = link ? link.href : '';
  defaultType = link ? link.getAttribute('type') : null;
}

function setIcon(href: string, type: string | null) {
  document.querySelectorAll("link[rel~='icon']").forEach((el) => el.remove());
  if (!href) return;
  const link = document.createElement('link');
  link.rel = 'icon';
  if (type) link.type = type;
  link.href = href;
  document.head.appendChild(link);
}

export function applyCloak(id: string) {
  captureDefaults();
  const cloak = CLOAKS[id];
  if (!cloak) {
    document.title = defaultTitle;
    setIcon(defaultIcon, defaultType);
    return;
  }
  document.title = cloak.title;
  setIcon(cloak.icon, null);
}

export function getCloak() {
  return read(CLOAK_KEY);
}

export function setCloak(id: string) {
  write(CLOAK_KEY, id);
  applyCloak(id);
}

export function getPanicKey() {
  return read(PANIC_KEY);
}

export function getPanicUrl() {
  return read(PANIC_URL);
}

export function normalizeUrl(raw: string) {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : 'https://' + text;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function savePanicUrl(raw: string) {
  const url = normalizeUrl(raw);
  if (!url) return null;
  write(PANIC_URL, url);
  return url;
}

export function capturePanicKey() {
  return new Promise<string>((resolve) => {
    capture = (key) => {
      capture = null;
      write(PANIC_KEY, key);
      resolve(key);
    };
  });
}

export function cancelCapture() {
  capture = null;
}

function onKeydown(e: KeyboardEvent) {
  if (capture) {
    e.preventDefault();
    capture(e.key);
    return;
  }
  const key = read(PANIC_KEY);
  const url = read(PANIC_URL);
  if (key && url && e.key === key) window.location.href = url;
}

export function initSettings() {
  captureDefaults();
  applyCloak(getCloak());
  window.addEventListener('keydown', onKeydown);
}
