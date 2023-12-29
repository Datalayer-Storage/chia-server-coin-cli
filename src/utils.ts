import fs from "fs";
import path from "path";
import { PrivateKey } from "chia-bls";
import { FullNode } from "chia-rpc";
import { KeyStore, StandardWallet } from "chia-wallet-lib";
import { Program } from "clvm-lib";
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

  const node = new FullNode({
    host: options.fullNodeHost || "localhost",
    port: options.fullNodePort || 8555,
    certPath: resolvePath("full_node/private_full_node.crt"),
    keyPath: resolvePath("full_node/private_full_node.key"),
    caCertPath: resolvePath("ca/chia_ca.crt"),
  });

  return node;
};

export const getWallet = async (options: Options = {}) => {
  const node = getNode(options);
  const walletRpc = new WalletRpc({
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

  const seed = privateKeyInfo?.private_key.seed;
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
  chiaFeeEstimator.configure({
    certificate_folder_path: `${process.env.CHIA_ROOT}/config/ssl`,
    default_fee: constants.defaultFeeAmountInMojo,
  });

  return chiaFeeEstimator.getFeeEstimate();
};

export const getGenisisChallenge = () => {
  const config = getChiaConfig();
  const genesisChallenge =
    config?.farmer?.network_overrides?.constants?.mainnet?.GENESIS_CHALLENGE;

  if (!genesisChallenge) {
    throw new Error("Could not get genesis challenge");
  }

  return genesisChallenge;
};
