import { describe, expect, it } from 'vitest';
import {
  buildDemoHash,
  getContractMethods,
  getRuntimeConfig,
  hexToBytes32,
  shortenAddress,
  uploadDocument,
  purchaseAccess,
  disableDocument,
  getDocument,
  getStats,
  hasAccess,
} from './contract';

describe('StudyVault contract service layer', () => {
  it('loads deployed StudyVault runtime config', () => {
    const runtime = getRuntimeConfig();

    expect(runtime.network).toBe('testnet');
    expect(runtime.vaultContractId.startsWith('C')).toBe(true);
    expect(runtime.policyContractId.startsWith('C')).toBe(true);
    expect(runtime.rpcUrl).toContain('soroban-testnet');
    expect(runtime.hasDeployedContracts).toBe(true);
  });

  it('maps frontend functions to real contract method names', () => {
    const methods = getContractMethods();

    expect(methods).toContain('initialize');
    expect(methods).toContain('upload_document');
    expect(methods).toContain('purchase_access');
    expect(methods).toContain('disable_document');
    expect(methods).toContain('get_document');
    expect(methods).toContain('has_access');
    expect(methods).toContain('stats');
    expect(methods).toContain('owner_document_count');
    expect(methods).toContain('owner_document_at');
    expect(methods).toContain('document_id_by_hash');
    expect(methods).toContain('status_label');
  });

  it('exports write transaction functions used by the UI', () => {
    expect(typeof uploadDocument).toBe('function');
    expect(typeof purchaseAccess).toBe('function');
    expect(typeof disableDocument).toBe('function');
  });

  it('exports read query functions used by the UI', () => {
    expect(typeof getDocument).toBe('function');
    expect(typeof getStats).toBe('function');
    expect(typeof hasAccess).toBe('function');
  });

  it('converts 32-byte document hash hex into bytes', () => {
    const hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const bytes = hexToBytes32(hash);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
    expect(bytes[0]).toBe(170);
  });

  it('rejects invalid document hash length', () => {
    expect(() => hexToBytes32('abc123')).toThrow('Document hash must be a 32-byte hex string');
  });

  it('builds deterministic demo hash for upload form', () => {
    const hash = buildDemoHash('Soroban Study Notes');

    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('shortens contract IDs and wallet addresses for display', () => {
    const value = 'CARUIK4ARRQEWZSKB4UPROVHFTFVH34L2RE7OV6YCBFCHTRJB4YE75XQ';

    expect(shortenAddress(value)).toBe('CARUIK4A...B4YE75XQ');
    expect(shortenAddress('')).toBe('Not available');
  });
});