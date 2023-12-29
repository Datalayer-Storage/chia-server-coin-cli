"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerCoinsByLauncherId = exports.deleteServerCoin = exports.createServerCoin = void 0;
const chia_bls_1 = require("chia-bls");
const chia_rpc_1 = require("chia-rpc");
const chia_wallet_lib_1 = require("chia-wallet-lib");
const clvm_lib_1 = require("clvm-lib");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const mirrorPuzzle = (0, utils_1.loadPuzzle)("p2_parent");
// curry in morpher = 1
const curriedMirrorPuzzle = mirrorPuzzle.curry([clvm_lib_1.Program.fromInt(1)]);
const createServerCoin = async (launcherId, urls, amount = constants_1.constants.defaultCoinAmountInMojo, options) => {
    const wallet = await (0, utils_1.getWallet)(options);
    const node = await (0, utils_1.getNode)(options);
    console.log("Creating MIrror");
    await wallet.sync();
    const hint = clvm_lib_1.Program.fromBigInt(launcherId.toBigInt() + 1n)
        .toHex()
        .padStart(64, "0")
        .slice(0, 64);
    let fee = options?.feeOverride;
    if (!fee) {
        fee = await (0, utils_1.calculateFee)();
    }
    console.log('@@@@@');
    const coinRecords = wallet.selectCoinRecords(amount + fee, chia_wallet_lib_1.CoinSelection.Smallest);
    console.log('!!!!!');
    if (!coinRecords.length)
        throw new Error("Insufficient balance");
    const totalValue = coinRecords.reduce((acc, coinRecord) => {
        return acc + coinRecord.coin.amount;
    }, 0);
    const changeAmount = totalValue - fee - 1;
    const coinSpends = coinRecords.map((coinRecord, index) => {
        const spentPuzzle = wallet.puzzleCache.find((puzzle) => puzzle.hashHex() === (0, chia_rpc_1.sanitizeHex)(coinRecord.coin.puzzle_hash));
        let solution = [];
        if (index === 0) {
            solution.push(clvm_lib_1.Program.fromSource(`(51 0x${curriedMirrorPuzzle.hashHex()} ${amount} (0x${hint} ${urls.join(" ")}))`));
            // Send the change to the same address
            solution.push(clvm_lib_1.Program.fromSource(`(51 ${(0, chia_rpc_1.formatHex)(coinRecord.coin.puzzle_hash)} ${changeAmount})`));
        }
        const coinSpend = {
            coin: coinRecord.coin,
            puzzle_reveal: spentPuzzle.serializeHex(),
            solution: spentPuzzle.getSolution(solution).serializeHex(),
        };
        return coinSpend;
    });
    const spendBundle = {
        coin_spends: coinSpends,
        aggregated_signature: chia_bls_1.JacobianPoint.infinityG2().toHex(),
    };
    console.log(JSON.stringify(spendBundle, null, 2));
    const aggSigMeExtraData = (0, chia_bls_1.fromHex)((0, utils_1.getGenisisChallenge)());
    wallet.signSpend(spendBundle, aggSigMeExtraData);
    console.log(await node.pushTx(spendBundle));
};
exports.createServerCoin = createServerCoin;
const deleteServerCoin = async (coinId, options) => {
    const wallet = await (0, utils_1.getWallet)(options);
    const node = await (0, utils_1.getNode)(options);
    await wallet.sync();
    const coinRecordResponse = await node.getCoinRecordByName(coinId);
    if (!coinRecordResponse.success) {
        throw new Error("Failed to get coin record");
    }
    const puzzleSolution = await node.getPuzzleAndSolution(coinRecordResponse.coin_record.coin.parent_coin_info, coinRecordResponse.coin_record.confirmed_block_index);
    if (!puzzleSolution.success) {
        throw new Error("Failed to get puzzle and solution");
    }
    const revealProgram = clvm_lib_1.Program.deserializeHex((0, chia_rpc_1.sanitizeHex)(puzzleSolution.coin_solution.puzzle_reveal));
    const delegatedPuzzle = chia_wallet_lib_1.puzzles.payToConditions.run(clvm_lib_1.Program.fromList([clvm_lib_1.Program.nil])).value;
    const standardTransactionInnerSolution = clvm_lib_1.Program.fromList([
        clvm_lib_1.Program.nil,
        delegatedPuzzle,
        clvm_lib_1.Program.nil,
    ]);
    let fee = options?.feeOverride;
    if (!fee) {
        fee = await (0, utils_1.calculateFee)();
    }
    const coinRecords = wallet.selectCoinRecords(1 + fee, chia_wallet_lib_1.CoinSelection.Smallest);
    if (!coinRecords.length)
        throw new Error("Insufficient balance");
    const totalValue = coinRecords.reduce((acc, coinRecord) => {
        return acc + coinRecord.coin.amount;
    }, 0);
    const changeAmount = totalValue - fee - 1;
    const coinSpends = coinRecords.map((coinRecord, index) => {
        const spentPuzzle = wallet.puzzleCache.find((puzzle) => puzzle.hashHex() === (0, chia_rpc_1.sanitizeHex)(coinRecord.coin.puzzle_hash));
        let solution = [];
        if (index === 0) {
            // Send the change to the same address
            solution.push(clvm_lib_1.Program.fromSource(`(51 ${(0, chia_rpc_1.formatHex)(coinRecord.coin.puzzle_hash)} ${changeAmount})`));
        }
        const coinSpend = {
            coin: coinRecord.coin,
            puzzle_reveal: spentPuzzle.serializeHex(),
            solution: spentPuzzle.getSolution(solution).serializeHex(),
        };
        return coinSpend;
    });
    const deleteCoinSpend = {
        coin: coinRecordResponse.coin_record.coin,
        puzzle_reveal: curriedMirrorPuzzle.serializeHex(),
        solution: clvm_lib_1.Program.fromSource(`(${puzzleSolution.coin_solution.coin.parent_coin_info} ${revealProgram} ${puzzleSolution.coin_solution.coin.amount} ${standardTransactionInnerSolution})`).serializeHex(),
    };
    coinSpends.push(deleteCoinSpend);
    const spendBundle = {
        coin_spends: coinSpends,
        aggregated_signature: chia_bls_1.JacobianPoint.infinityG2().toHex(),
    };
    console.log(spendBundle);
    const aggSigMeExtraData = (0, chia_bls_1.fromHex)((0, utils_1.getGenisisChallenge)());
    wallet.signSpend(spendBundle, aggSigMeExtraData);
    console.log(await node.pushTx(spendBundle));
};
exports.deleteServerCoin = deleteServerCoin;
const getServerCoinsByLauncherId = async (launcherId, options) => {
    const wallet = await (0, utils_1.getWallet)(options);
    const node = await (0, utils_1.getNode)(options);
    await wallet.sync();
    // Hint is launcherId + 1 to distinguish from Mirror Coin
    const hint = clvm_lib_1.Program.fromBigInt(launcherId.toBigInt() + 1n)
        .toHex()
        .padStart(64, "0")
        .slice(0, 64);
    const response = await node.getCoinRecordsByHint(hint);
    // console.log(JSON.stringify(response, null, 2));
    if (!response.success) {
        throw new Error("Failed to get coin records");
    }
    const servers = [];
    for (const coinRecord of response.coin_records) {
        const puzzleSolution = await node.getPuzzleAndSolution(coinRecord.coin.parent_coin_info, coinRecord.confirmed_block_index);
        if (!puzzleSolution.success) {
            throw new Error("Failed to get puzzle and solution");
        }
        const revealProgram = clvm_lib_1.Program.deserializeHex((0, chia_rpc_1.sanitizeHex)(puzzleSolution.coin_solution.puzzle_reveal));
        const solutionProgram = clvm_lib_1.Program.deserializeHex((0, chia_rpc_1.sanitizeHex)(puzzleSolution.coin_solution.solution));
        const conditions = revealProgram.run(solutionProgram).value;
        const createCoinConditions = conditions.toList().filter((condition) => {
            if (condition.toList().length === 4 &&
                condition.rest.first.equals(clvm_lib_1.Program.fromHex((0, chia_rpc_1.sanitizeHex)(curriedMirrorPuzzle.hashHex())))) {
                return condition.first.toInt() === 51;
            }
            return false;
        });
        const urlString = createCoinConditions.map((condition) => {
            return condition.rest.rest.rest.first.rest;
        });
        const urls = urlString[0].toList().map((url) => url.toText());
        const ourPuzzle = wallet.puzzleCache.find((puzzle) => puzzle.equals(revealProgram));
        servers.push({
            amount: coinRecord.coin.amount,
            coin_id: (0, chia_rpc_1.formatHex)((0, chia_bls_1.toHex)((0, chia_rpc_1.toCoinId)(coinRecord.coin))),
            launcher_id: (0, chia_rpc_1.formatHex)(launcherId.toHex()),
            ours: ourPuzzle !== undefined,
            urls,
        });
    }
    console.log(JSON.stringify({ servers }, null, 2));
    return { servers };
};
exports.getServerCoinsByLauncherId = getServerCoinsByLauncherId;
