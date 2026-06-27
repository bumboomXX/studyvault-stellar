export const CONTRACT_CONFIG = {
  network: 'testnet',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  explorerBaseUrl: 'https://stellar.expert/explorer/testnet',
  studyVaultContractId: 'CARUIK4ARRQEWZSKB4UPROVHFTFVH34L2RFZOV6YCBECHIRJB4YE75XQ',
  studyVaultPolicyContractId: 'CCHSKQQKFEK3MTGOAB4GBK4XDLHYT7NIVHWIASUYGHXS4ON7ZMMBOCDZ',
  deployerPublicKey: 'GB6N4JRWRW5Z4LOJUT7E6LOZCKL5YCS7QHJJU3W5X2IKX7ETE245DSPM',
  deployedAt: '2026-06-27T19:32:44Z',
  projectName: 'StudyVault',
  repository: 'https://github.com/bumboomXX/studyvault-stellar'
} as const;

export type ContractConfig = typeof CONTRACT_CONFIG;

export const hasDeployedContracts =
  CONTRACT_CONFIG.studyVaultContractId.length > 0 &&
  CONTRACT_CONFIG.studyVaultPolicyContractId.length > 0;

export const getStudyVaultExplorerUrl = () =>
  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.studyVaultContractId;

export const getPolicyExplorerUrl = () =>
  CONTRACT_CONFIG.explorerBaseUrl + '/contract/' + CONTRACT_CONFIG.studyVaultPolicyContractId;
