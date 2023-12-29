import fs from "fs";
import path from "path";
import { PrivateKey } from "chia-bls";
import { FullNode } from "chia-rpc";
import { KeyStore, StandardWallet } from "chia-wallet-lib";
import { Program } from "clvm-lib";
import { mnemonicToSeedSync } from "bip39";
import WalletRpc from "chia-wallet";
import { getChiaConfig } from "chia-config-loader";
import chiaFeeEstimator from "chia-fee-estimator";
import { constants } from "./constants";

export interface Options {
  feeOverride?: number;
  fullNodeHost?: string;
  fullNodePort?: number;
  certificateFolderPath?: string;
}

export const getNode = (options: Options = {}) => {
  const defaultCertFolderPath = `${process.env.CHIA_ROOT}/config/ssl`;

  const resolvePath = (subPath: string) =>
    path.resolve(
      `${options.certificateFolderPath || defaultCertFolderPath}/${subPath}`
    );

  const config = getChiaConfig();
  const defaultFullNodePort = config?.full_node?.rpc_port || 8555;

  const node = new FullNode({
    host: options.fullNodeHost || "localhost",
    port: options.fullNodePort || defaultFullNodePort,
    certPath: resolvePath("full_node/private_full_node.crt"),
    keyPath: resolvePath("full_node/private_full_node.key"),
    caCertPath: resolvePath("ca/chia_ca.crt"),
  });

  return node;
};

export const getWallet = async (node: FullNode) => {
  const config = getChiaConfig();
  const defaultWalletPort = config?.wallet?.rpc_port || 9256;

  const walletRpc = new WalletRpc({
    wallet_host: `https://localhost:${defaultWalletPort}`,
    certificate_folder_path: `${process.env.CHIA_ROOT}/config/ssl`,
  });
  const fingerprintInfo = await walletRpc.getLoggedInFingerprint({});

  if (fingerprintInfo?.success === false) {
    throw new Error("Could not get fingerprint");
  }

  console.log(`Using fingerprint ${fingerprintInfo.fingerprint}`);

  const privateKeyInfo = await walletRpc.getPrivateKey({
    fingerprint: fingerprintInfo.fingerprint,
  });

  if (privateKeyInfo?.success === false) {
    throw new Error("Could not get private key");
  }

  const mnemonic = privateKeyInfo?.private_key.seed;
  const seed = mnemonicToSeedSync(mnemonic);
  const privateKey = PrivateKey.fromSeed(seed);
  const keyStore = new KeyStore(privateKey);
  const wallet = new StandardWallet(node, keyStore);

  return wallet;
};

export const loadPuzzle = (puzzleName: string) => {
  return Program.deserializeHex(
    fs.readFileSync(`puzzles/${puzzleName}.clsp.hex`, "utf8")
  );
};

export const calculateFee = () => {
  const config = getChiaConfig();
  const defaultFullNodePort = config?.full_node?.rpc_port || 8555;

  chiaFeeEstimator.configure({
    full_node_host: `https://localhost:${defaultFullNodePort}`,
    certificate_folder_path: `${process.env.CHIA_ROOT}/config/ssl`,
    default_fee: constants.defaultFeeAmountInMojo,
  });

  return chiaFeeEstimator.getFeeEstimate();
};

export const getGenesisChallenge = () => {
  const config = getChiaConfig();
  const genesisChallenge =
    config?.farmer?.network_overrides?.constants?.mainnet?.GENESIS_CHALLENGE;

  if (!genesisChallenge) {
    throw new Error("Could not get genesis challenge");
  }

  return genesisChallenge;
};
