import { memoize } from "lodash";
import path from "path";
import fs from "fs";
import dns from 'dns';
import { promisify } from 'util';
import { Tls, Peer, Wallet } from "chia-server-coin";
import WalletRpc from "chia-wallet";
import { getChiaConfig } from "chia-config-loader";
import chiaFeeEstimator from "chia-fee-estimator";
import { constants } from "./constants";
// @ts-ignore
import { getChiaRoot } from "chia-root-resolver"; 

const resolveA = promisify(dns.resolve4);

export interface Options {
  feeOverride?: number;
  fullNodeHost?: string;
  fullNodePort?: number;
  walletHost?: string;
  walletPort?: number;
  certificateFolderPath?: string;
  verbose?: boolean;
  autoFindPeer?: boolean;
}

export const stringToUint8Array = (str: String) => {
  const buffer = Buffer.from(str, "hex");
  return new Uint8Array(buffer);
};

async function getRandomPeerIP() {
  try {
    const records = await resolveA('dns-introducer.chia.net');
    const ips = records.flat();
    if (ips.length === 0) {
      throw new Error('No IPs found in DNS records.');
    }
    const randomIP = ips[Math.floor(Math.random() * ips.length)];
    console.log(`Using Fullnode IP: ${randomIP}`);
    return randomIP;
  } catch (error) {
    console.error('Error resolving DNS:', error);
    console.log('Using default IP: "127.0.0.1"');
    return "127.0.0.1";
  }
}

export const getPeer = memoize(async (options: Options = {}) => {
  const chiaRoot = getChiaRoot();

  const certificateFolderPath = options.certificateFolderPath || `${chiaRoot}/config/ssl`;

  const sslFolder = path.resolve(`${certificateFolderPath}/dig`);

  if (!fs.existsSync(sslFolder)) {
    if (options?.verbose) {
      console.log("Creating new SSL certificate at:", sslFolder);
    }
    fs.mkdirSync(sslFolder);
  }

  const tls = new Tls(path.resolve(`${sslFolder}/public_wallet.crt`), path.resolve(`${sslFolder}/public_wallet.key`));
  const config = getChiaConfig();
  const defaultFullNodePort = config?.full_node?.port || 8444;
  let defaultFullNodeHost = "127.0.0.1";

  if (options?.autoFindPeer) {
    defaultFullNodeHost = await getRandomPeerIP();
  }

  if (options?.verbose) {
    console.log("Connecting to full node:", `${options.fullNodeHost || defaultFullNodeHost}:${options.fullNodePort || defaultFullNodePort}`);
    console.log("Using certificate folder:", sslFolder);
  }

  return Peer.connect(`${options.fullNodeHost || defaultFullNodeHost}:${options.fullNodePort || defaultFullNodePort}`, getSelectedNetwork(), tls);
});

export const getSelectedNetwork = () => {
  const config = getChiaConfig();
  return config?.fullNodeHost?.selected_network || 'mainnet';
}

export const getWallet = memoize(async (peer: Peer, options: Options = {}) => {
  const config = getChiaConfig();
  const defaultWalletPort = config?.wallet?.rpc_port || 9256;

  const walletHost = options.walletHost || "127.0.0.1";
  const port = options.walletPort || defaultWalletPort;

  const chiaRoot = getChiaRoot();

  const certificateFolderPath = path.resolve(options.certificateFolderPath || `${chiaRoot}/config/ssl`);

  if (options?.verbose) {
    console.log("Connecting to wallet:", `https://${walletHost}:${port}`);
    console.log("Using certificate folder:", certificateFolderPath);
  }

  const walletRpc = new WalletRpc({
    wallet_host: `https://${walletHost}:${port}`,
    certificate_folder_path: certificateFolderPath,
  });
  const fingerprintInfo = await walletRpc.getLoggedInFingerprint({});

  if (fingerprintInfo?.success === false) {
    throw new Error("Could not get fingerprint");
  }

  const privateKeyInfo = await walletRpc.getPrivateKey({
    fingerprint: fingerprintInfo.fingerprint,
  });

  if (privateKeyInfo?.success === false) {
    throw new Error("Could not get private key");
  }

  const mnemonic = privateKeyInfo?.private_key.seed;

  if (options?.verbose) {
    console.log("Using Network:", getSelectedNetwork());
  }

  return Wallet.initialSync(
    peer,
    mnemonic,
    Buffer.from(getGenesisChallenge(getSelectedNetwork()), "hex")
  );
});

export const calculateFee = (options: Options = {}) => {
  const config = getChiaConfig();
  const fullNodeHost = options.fullNodeHost || "127.0.0.1";
  const defaultFullNodePort = config?.full_node?.rpc_port || 8555;

  const chiaRoot = getChiaRoot();

  chiaFeeEstimator.configure({
    full_node_host: `https://${fullNodeHost}:${defaultFullNodePort}`,
    certificate_folder_path: `${chiaRoot}/config/ssl`,
    default_fee: constants.defaultFeeAmountInMojo,
  });

  return chiaFeeEstimator.getFeeEstimate();
};

export const getGenesisChallenge = (networkId = "mainnet") => {
  const config = getChiaConfig();
  const genesisChallenge =
    config?.farmer?.network_overrides?.constants?.[networkId]
      ?.GENESIS_CHALLENGE;

  if (!genesisChallenge) {
    throw new Error("Could not get genesis challenge");
  }

  return genesisChallenge;
};
