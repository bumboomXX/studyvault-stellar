import * as StellarSdk from '@stellar/stellar-sdk';
import {
  CONTRACT_CONFIG,
  getPolicyExplorerUrl,
  getStudyVaultExplorerUrl,
  hasDeployedContracts,
} from '../contractConfig';
import { signWithFreighter } from './wallet';

const SDK = StellarSdk as any;

export type UploadDocumentInput = {
  owner: string;
  title: string;
  documentHashHex: string;
  metadataUri: string;
  price: string;
};

export type PurchaseAccessInput = {
  buyer: string;
  documentId: number;
  payment: string;
};

export type DisableDocumentInput = {
  owner: string;
  documentId: number;
};

export type SubmittedTransaction = {
  hash: string;
  status: string;
  explorerUrl: string;
};

export type RuntimeConfig = {
  network: string;
  rpcUrl: string;
  vaultContractId: string;
  policyContractId: string;
  vaultExplorerUrl: string;
  policyExplorerUrl: string;
  deployedAt: string;
  hasDeployedContracts: boolean;
};

const getServer = () => {
  const ServerClass = SDK.SorobanRpc?.Server || SDK.rpc?.Server;

  if (!ServerClass) {
    throw new Error('Soroban RPC Server class was not found in @stellar/stellar-sdk.');
  }

  return new ServerClass(CONTRACT_CONFIG.rpcUrl, { allowHttp: false });
};

const getVaultContract = () => {
  return new SDK.Contract(CONTRACT_CONFIG.studyVaultContractId);
};

const buildAddressScVal = (address: string) => {
  return new SDK.Address(address).toScVal();
};

const buildStringScVal = (value: string) => {
  return SDK.nativeToScVal(value, { type: 'string' });
};

const buildU32ScVal = (value: number) => {
  return SDK.nativeToScVal(value, { type: 'u32' });
};

const buildI128ScVal = (value: string) => {
  return SDK.nativeToScVal(BigInt(value || '0'), { type: 'i128' });
};

const normalizeHex = (value: string) => {
  return value.trim().replace(/^0x/i, '').toLowerCase();
};

export const hexToBytes32 = (hexValue: string): Uint8Array => {
  const clean = normalizeHex(hexValue);

  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('Document hash must be a 32-byte hex string, 64 hex characters.');
  }

  const bytes = new Uint8Array(32);

  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
};

const buildBytesN32ScVal = (hexValue: string) => {
  return SDK.xdr.ScVal.scvBytes(hexToBytes32(hexValue));
};

const buildTransaction = async (sourcePublicKey: string, operation: unknown) => {
  const server = getServer();
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const transaction = new SDK.TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  return server.prepareTransaction(transaction);
};

const submitSignedTransaction = async (signedXdr: string): Promise<SubmittedTransaction> => {
  const server = getServer();
  const signedTransaction = new SDK.Transaction(signedXdr, CONTRACT_CONFIG.networkPassphrase);
  const sendResult = await server.sendTransaction(signedTransaction);

  if (!sendResult.hash) {
    throw new Error(sendResult.errorResultXdr || 'Transaction was rejected by Soroban RPC.');
  }

  return {
    hash: sendResult.hash,
    status: sendResult.status || 'PENDING',
    explorerUrl: `${CONTRACT_CONFIG.explorerBaseUrl}/tx/${sendResult.hash}`,
  };
};

const invokeContract = async (
  sourcePublicKey: string,
  method: string,
  args: unknown[],
): Promise<SubmittedTransaction> => {
  const contract = getVaultContract();
  const operation = contract.call(method, ...args);
  const preparedTransaction = await buildTransaction(sourcePublicKey, operation);
  const signedXdr = await signWithFreighter(preparedTransaction.toXDR(), sourcePublicKey);

  return submitSignedTransaction(signedXdr);
};

const simulateContract = async (sourcePublicKey: string, method: string, args: unknown[]) => {
  const server = getServer();
  const contract = getVaultContract();
  const operation = contract.call(method, ...args);
  const sourceAccount = await server.getAccount(sourcePublicKey);

  const transaction = new SDK.TransactionBuilder(sourceAccount, {
    fee: SDK.BASE_FEE,
    networkPassphrase: CONTRACT_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (simulation.error) {
    throw new Error(simulation.error);
  }

  return simulation.result?.retval;
};

export const getRuntimeConfig = (): RuntimeConfig => {
  return {
    network: CONTRACT_CONFIG.network,
    rpcUrl: CONTRACT_CONFIG.rpcUrl,
    vaultContractId: CONTRACT_CONFIG.studyVaultContractId,
    policyContractId: CONTRACT_CONFIG.studyVaultPolicyContractId,
    vaultExplorerUrl: getStudyVaultExplorerUrl(),
    policyExplorerUrl: getPolicyExplorerUrl(),
    deployedAt: CONTRACT_CONFIG.deployedAt,
    hasDeployedContracts,
  };
};

export const shortenAddress = (value: string, prefix = 8, suffix = 8) => {
  if (!value) {
    return 'Not available';
  }

  if (value.length <= prefix + suffix + 3) {
    return value;
  }

  return `${value.slice(0, prefix)}...${value.slice(-suffix)}`;
};

export const uploadDocument = async (input: UploadDocumentInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.owner, 'upload_document', [
    buildAddressScVal(input.owner),
    buildStringScVal(input.title),
    buildBytesN32ScVal(input.documentHashHex),
    buildStringScVal(input.metadataUri),
    buildI128ScVal(input.price),
  ]);
};

export const purchaseAccess = async (input: PurchaseAccessInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.buyer, 'purchase_access', [
    buildAddressScVal(input.buyer),
    buildU32ScVal(input.documentId),
    buildI128ScVal(input.payment),
  ]);
};

export const disableDocument = async (input: DisableDocumentInput): Promise<SubmittedTransaction> => {
  return invokeContract(input.owner, 'disable_document', [
    buildAddressScVal(input.owner),
    buildU32ScVal(input.documentId),
  ]);
};

export const getDocument = async (sourcePublicKey: string, documentId: number): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'get_document', [buildU32ScVal(documentId)]);

  return result ? SDK.scValToNative(result) : null;
};

export const hasAccess = async (
  sourcePublicKey: string,
  user: string,
  documentId: number,
): Promise<boolean> => {
  const result = await simulateContract(sourcePublicKey, 'has_access', [
    buildAddressScVal(user),
    buildU32ScVal(documentId),
  ]);

  return Boolean(result ? SDK.scValToNative(result) : false);
};

export const getStats = async (sourcePublicKey: string): Promise<unknown> => {
  const result = await simulateContract(sourcePublicKey, 'stats', []);

  return result ? SDK.scValToNative(result) : null;
};

export const getContractMethods = () => [
  'initialize',
  'upload_document',
  'purchase_access',
  'disable_document',
  'get_document',
  'has_access',
  'stats',
  'owner_document_count',
  'owner_document_at',
  'document_id_by_hash',
  'status_label',
];

export const buildDemoHash = (seed: string) => {
  const normalized = seed.trim() || 'studyvault-demo-document';
  let output = '';

  for (let index = 0; index < 64; index += 1) {
    const charCode = normalized.charCodeAt(index % normalized.length);
    output += ((charCode + index) % 16).toString(16);
  }

  return output;
};