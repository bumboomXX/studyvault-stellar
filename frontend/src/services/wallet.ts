import * as freighterApi from '@stellar/freighter-api';
import { CONTRACT_CONFIG } from '../contractConfig';

type FreighterNamespace = {
  isConnected?: () => Promise<boolean> | boolean;
  isAllowed?: () => Promise<boolean> | boolean;
  setAllowed?: () => Promise<boolean> | boolean;
  requestAccess?: () => Promise<string | { address?: string; publicKey?: string; error?: string }>;
  getAddress?: () => Promise<string | { address?: string; publicKey?: string; error?: string }>;
  signTransaction?: (
    transactionXdr: string,
    options?: {
      network?: string;
      networkPassphrase?: string;
      accountToSign?: string;
    },
  ) => Promise<string | { signedTxXdr?: string; signedXdr?: string; error?: string }>;
};

const freighter = freighterApi as unknown as FreighterNamespace;

const readAddressResult = (result: unknown): string => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as { address?: string; publicKey?: string; error?: string };

    if (value.error) {
      throw new Error(value.error);
    }

    if (value.address) {
      return value.address;
    }

    if (value.publicKey) {
      return value.publicKey;
    }
  }

  throw new Error('Unable to read Freighter public key.');
};

const readSignedXdr = (result: unknown): string => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as { signedTxXdr?: string; signedXdr?: string; error?: string };

    if (value.error) {
      throw new Error(value.error);
    }

    if (value.signedTxXdr) {
      return value.signedTxXdr;
    }

    if (value.signedXdr) {
      return value.signedXdr;
    }
  }

  throw new Error('Freighter did not return a signed transaction.');
};

export const isFreighterAvailable = () => {
  return Boolean(
    freighter.requestAccess ||
      freighter.getAddress ||
      freighter.signTransaction ||
      typeof window !== 'undefined',
  );
};

export const connectWallet = async (): Promise<string> => {
  if (freighter.isConnected) {
    const connected = await freighter.isConnected();

    if (!connected) {
      throw new Error('Freighter wallet is not connected. Please install or unlock Freighter.');
    }
  }

  if (freighter.isAllowed) {
    const allowed = await freighter.isAllowed();

    if (!allowed && freighter.setAllowed) {
      await freighter.setAllowed();
    }
  }

  if (freighter.requestAccess) {
    return readAddressResult(await freighter.requestAccess());
  }

  if (freighter.getAddress) {
    return readAddressResult(await freighter.getAddress());
  }

  throw new Error('Freighter requestAccess/getAddress API is not available.');
};

export const getWalletAddress = async (): Promise<string> => {
  if (freighter.getAddress) {
    return readAddressResult(await freighter.getAddress());
  }

  return connectWallet();
};

export const signWithFreighter = async (transactionXdr: string, accountToSign: string) => {
  if (!freighter.signTransaction) {
    throw new Error('Freighter signTransaction API is not available.');
  }

  const signedResult = await freighter.signTransaction(transactionXdr, {
    network: CONTRACT_CONFIG.network,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
    accountToSign,
  });

  return readSignedXdr(signedResult);
};