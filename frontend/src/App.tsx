import { useMemo, useState } from 'react';
import './App.css';
import { connectWallet } from './services/wallet';
import {
  buildDemoHash,
  disableDocument,
  getContractMethods,
  getDocument,
  getRuntimeConfig,
  getStats,
  purchaseAccess,
  shortenAddress,
  uploadDocument,
  type SubmittedTransaction,
} from './services/contract';

function App() {
  const runtime = useMemo(() => getRuntimeConfig(), []);
  const methods = useMemo(() => getContractMethods(), []);

  const [walletAddress, setWalletAddress] = useState('');
  const [title, setTitle] = useState('Soroban Study Notes');
  const [metadataUri, setMetadataUri] = useState('ipfs://studyvault/soroban-study-notes');
  const [documentHash, setDocumentHash] = useState(buildDemoHash('Soroban Study Notes'));
  const [price, setPrice] = useState('100');
  const [documentId, setDocumentId] = useState(1);
  const [payment, setPayment] = useState('100');
  const [lastTransaction, setLastTransaction] = useState<SubmittedTransaction | null>(null);
  const [queryResult, setQueryResult] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to connect Freighter on Stellar testnet.');

  const requireWallet = async () => {
    if (walletAddress) {
      return walletAddress;
    }

    const connected = await connectWallet();
    setWalletAddress(connected);
    return connected;
  };

  const handleConnect = async () => {
    try {
      setStatusMessage('Connecting Freighter wallet...');
      const connected = await connectWallet();
      setWalletAddress(connected);
      setStatusMessage('Wallet connected successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Wallet connection failed.');
    }
  };

  const handleUploadDocument = async () => {
    try {
      const owner = await requireWallet();
      setStatusMessage('Preparing upload_document transaction for Freighter signature...');

      const tx = await uploadDocument({
        owner,
        title,
        documentHashHex: documentHash,
        metadataUri,
        price,
      });

      setLastTransaction(tx);
      setStatusMessage('upload_document transaction submitted.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Upload transaction failed.');
    }
  };

  const handlePurchaseAccess = async () => {
    try {
      const buyer = await requireWallet();
      setStatusMessage('Preparing purchase_access transaction for Freighter signature...');

      const tx = await purchaseAccess({
        buyer,
        documentId,
        payment,
      });

      setLastTransaction(tx);
      setStatusMessage('purchase_access transaction submitted.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Purchase transaction failed.');
    }
  };

  const handleDisableDocument = async () => {
    try {
      const owner = await requireWallet();
      setStatusMessage('Preparing disable_document transaction for Freighter signature...');

      const tx = await disableDocument({
        owner,
        documentId,
      });

      setLastTransaction(tx);
      setStatusMessage('disable_document transaction submitted.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Disable transaction failed.');
    }
  };

  const handleGetDocument = async () => {
    try {
      const source = await requireWallet();
      setStatusMessage('Reading get_document through Soroban RPC simulation...');

      const result = await getDocument(source, documentId);

      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('get_document query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'get_document query failed.');
    }
  };

  const handleGetStats = async () => {
    try {
      const source = await requireWallet();
      setStatusMessage('Reading stats through Soroban RPC simulation...');

      const result = await getStats(source);

      setQueryResult(JSON.stringify(result, null, 2));
      setStatusMessage('stats query completed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'stats query failed.');
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <nav className="topbar">
          <div className="brand">
            <div className="brand-mark">SV</div>
            <div>
              <p>Stellar Level 3 dApp</p>
              <h1>StudyVault</h1>
            </div>
          </div>

          <button className="wallet-button" onClick={handleConnect}>
            {walletAddress ? shortenAddress(walletAddress) : 'Connect Freighter'}
          </button>
        </nav>

        <div className="hero-grid">
          <div>
            <p className="eyebrow">Study document marketplace on Soroban</p>
            <h2>Upload study documents, sell access, and verify records on Stellar testnet.</h2>
            <p className="hero-copy">
              StudyVault uses a Soroban contract for document records and a policy contract for
              price validation. The frontend connects Freighter, prepares contract transactions,
              requests wallet signatures, and submits signed transactions through Soroban RPC.
            </p>

            <div className="hero-actions">
              <a href={runtime.vaultExplorerUrl} target="_blank" rel="noreferrer">
                Vault contract
              </a>
              <a href={runtime.policyExplorerUrl} target="_blank" rel="noreferrer">
                Policy contract
              </a>
            </div>
          </div>

          <article className="deployment-card">
            <p className="card-label">Deployment</p>
            <h3>{runtime.hasDeployedContracts ? 'Live on testnet' : 'Not deployed'}</h3>
            <div>
              <span>StudyVault</span>
              <strong>{shortenAddress(runtime.vaultContractId)}</strong>
            </div>
            <div>
              <span>Policy</span>
              <strong>{shortenAddress(runtime.policyContractId)}</strong>
            </div>
            <div>
              <span>RPC</span>
              <strong>{runtime.rpcUrl.replace('https://', '')}</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="metrics-grid">
        <article>
          <p>Contracts</p>
          <strong>2</strong>
          <span>Main vault + policy validator</span>
        </article>
        <article>
          <p>Contract tests</p>
          <strong>7</strong>
          <span>Upload, purchase, disable, policy checks</span>
        </article>
        <article>
          <p>Wallet</p>
          <strong>{walletAddress ? 'Connected' : 'Ready'}</strong>
          <span>Freighter requestAccess + signTransaction</span>
        </article>
        <article>
          <p>Network</p>
          <strong>{runtime.network}</strong>
          <span>Stellar Soroban testnet</span>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Write transaction</p>
            <h2>Upload document</h2>
          </div>

          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label>
            Metadata URI
            <input value={metadataUri} onChange={(event) => setMetadataUri(event.target.value)} />
          </label>

          <label>
            Document hash hex
            <input value={documentHash} onChange={(event) => setDocumentHash(event.target.value)} />
          </label>

          <label>
            Price
            <input value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>

          <button className="primary-action" onClick={handleUploadDocument}>
            Sign upload_document
          </button>
        </article>

        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Contract actions</p>
            <h2>Access and management</h2>
          </div>

          <label>
            Document ID
            <input
              type="number"
              min="1"
              value={documentId}
              onChange={(event) => setDocumentId(Number(event.target.value))}
            />
          </label>

          <label>
            Payment
            <input value={payment} onChange={(event) => setPayment(event.target.value)} />
          </label>

          <div className="button-grid">
            <button onClick={handlePurchaseAccess}>Sign purchase_access</button>
            <button onClick={handleDisableDocument}>Sign disable_document</button>
            <button onClick={handleGetDocument}>Read get_document</button>
            <button onClick={handleGetStats}>Read stats</button>
          </div>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Transaction monitor</p>
            <h2>Latest status</h2>
          </div>

          <div className="status-box">
            <p>{statusMessage}</p>
            {lastTransaction ? (
              <a href={lastTransaction.explorerUrl} target="_blank" rel="noreferrer">
                View transaction: {shortenAddress(lastTransaction.hash, 10, 10)}
              </a>
            ) : (
              <span>No transaction submitted yet.</span>
            )}
          </div>

          <pre>{queryResult || 'Read results will appear here.'}</pre>
        </article>

        <article className="panel">
          <div className="section-heading">
            <p className="eyebrow">Frontend ↔ contract matching</p>
            <h2>StudyVault methods</h2>
          </div>

          <div className="method-list">
            {methods.map((method) => (
              <span key={method}>{method}</span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;