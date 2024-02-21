import { memoize } from "lodash";
import path from "path";
import { Tls, Peer, Wallet } from "server-coin";
import WalletRpc from "chia-wallet";
import { getChiaConfig } from "chia-config-loader";
import chiaFeeEstimator from "chia-fee-estimator";
import { constants } from "./constants";
// @ts-ignore
import { getChiaRoot } from "chia-root-resolver"; 

export interface Options {
  feeOverride?: number;
  fullNodeHost?: string;
  fullNodePort?: number;
  walletHost?: string;
  walletPort?: number;
  certificateFolderPath?: string;
}

export const stringToUint8Array = (str: String) => {
  const buffer = Buffer.from(str, "hex");
  return new Uint8Array(buffer);
};

export const getPeer = memoize(async (options: Options = {}) => {
  const chiaRoot = getChiaRoot();
  const tls = new Tls(path.resolve(`${chiaRoot}/config/ssl/wallet/public_wallet.crt`), path.resolve(`${chiaRoot}/config/ssl/wallet/public_wallet.key`));
  const config = getChiaConfig();
  const defaultFullNodePort = config?.full_node?.port || 8444;
  const defaultFullNodeHost = "127.0.0.1";

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

  const walletRpc = new WalletRpc({
    wallet_host: `https://${walletHost}:${port}`,
    certificate_folder_path: `${chiaRoot}/config/ssl`,
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
