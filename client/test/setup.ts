import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearMessageCache } from '../src/lib/message-cache';

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); clearMessageCache(); vi.unstubAllGlobals(); });
Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
HTMLElement.prototype.scrollIntoView = vi.fn();
