"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGenesisChallenge = exports.calculateFee = exports.loadPuzzle = exports.getWallet = exports.getNode = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chia_bls_1 = require("chia-bls");
const chia_rpc_1 = require("chia-rpc");
const chia_wallet_lib_1 = require("chia-wallet-lib");
const clvm_lib_1 = require("clvm-lib");
const chia_wallet_1 = __importDefault(require("chia-wallet"));
const chia_config_loader_1 = require("chia-config-loader");
const chia_fee_estimator_1 = __importDefault(require("chia-fee-estimator"));
const constants_1 = require("./constants");
const getNode = (options = {}) => {
    const defaultCertFolderPath = `${process.env.CHIA_ROOT}/config/ssl`;
    const resolvePath = (subPath) => path_1.default.resolve(`${options.certificateFolderPath || defaultCertFolderPath}/${subPath}`);
    const config = (0, chia_config_loader_1.getChiaConfig)();
    const defaultFullNodePort = config?.full_node?.rpc_port || 8555;
    const node = new chia_rpc_1.FullNode({
        host: options.fullNodeHost || "localhost",
        port: options.fullNodePort || defaultFullNodePort,
        certPath: resolvePath("full_node/private_full_node.crt"),
        keyPath: resolvePath("full_node/private_full_node.key"),
        caCertPath: resolvePath("ca/chia_ca.crt"),
    });
    return node;
};
exports.getNode = getNode;
const getWallet = async (node) => {
    const config = (0, chia_config_loader_1.getChiaConfig)();
    const defaultWalletPort = config?.wallet?.rpc_port || 9256;
    const walletRpc = new chia_wallet_1.default({
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
    const seed = privateKeyInfo?.private_key.seed;
    const privateKey = chia_bls_1.PrivateKey.fromSeed(seed);
    const keyStore = new chia_wallet_lib_1.KeyStore(privateKey);
    const wallet = new chia_wallet_lib_1.StandardWallet(node, keyStore);
    return wallet;
};
exports.getWallet = getWallet;
const loadPuzzle = (puzzleName) => {
    return clvm_lib_1.Program.deserializeHex(fs_1.default.readFileSync(`puzzles/${puzzleName}.clsp.hex`, "utf8"));
};
exports.loadPuzzle = loadPuzzle;
const calculateFee = () => {
    chia_fee_estimator_1.default.configure({
        certificate_folder_path: `${process.env.CHIA_ROOT}/config/ssl`,
        default_fee: constants_1.constants.defaultFeeAmountInMojo,
    });
    return chia_fee_estimator_1.default.getFeeEstimate();
};
exports.calculateFee = calculateFee;
const getGenesisChallenge = () => {
    const config = (0, chia_config_loader_1.getChiaConfig)();
    const genesisChallenge = config?.farmer?.network_overrides?.constants?.mainnet?.GENESIS_CHALLENGE;
    if (!genesisChallenge) {
        throw new Error("Could not get genesis challenge");
    }
    return genesisChallenge;
};
exports.getGenesisChallenge = getGenesisChallenge;
