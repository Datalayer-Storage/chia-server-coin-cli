import { bytesEqual, toCoinId } from "chia-server-coin";
import { constants } from "./constants";
import { Options } from "./utils";

import { getPeer, getWallet, stringToUint8Array } from "./utils";

export const createServerCoin = async (
  launcherId: String,
  urls: string[],
  amount: number = constants.defaultCoinAmountInMojo,
  options?: Options
) => {
  const peer = await getPeer(options);
  const wallet = await getWallet(peer, options);

  if (options?.verbose) {
    console.log('derivation index:', await wallet.derivationIndex());
  }

  console.log(
    await wallet.createServerCoin(
      stringToUint8Array(launcherId),
      amount,
      options?.feeOverride || constants.defaultFeeAmountInMojo,
      urls
    )
  );
};

export const deleteServerCoin = async (storeId: string, coinId: string, options?: Options) => {
  const peer = await getPeer(options);
  const wallet = await getWallet(peer, options);

  const serverCoinIter = await peer.fetchServerCoins(stringToUint8Array(storeId));

  const coinsToDelete = [];

  while (true) {
    const next = await serverCoinIter.next();
    if (next === null) {
      break;
    }

    if (bytesEqual(toCoinId(next.coin), stringToUint8Array(coinId))) {
      coinsToDelete.push(next);
    }
  }

  await wallet.deleteServerCoins(
    coinsToDelete.map((coin) => coin.coin),
    options?.feeOverride || constants.defaultFeeAmountInMojo
  );

  console.log(`Deleted coin ${coinId}`);
};

export const getServerCoinsByLauncherId = async (launcherId: String, options?: Options) => {
  const peer = await getPeer(options);

  const serverCoins = [];

  const serverCoinIter = await peer.fetchServerCoins(stringToUint8Array(launcherId));

  while (true) {
    const next = await serverCoinIter.next();
    if (next === null) {
      break;
    }
    serverCoins.push(next);
  }

  const wallet = await getWallet(peer, options);

  const serverInfo = await Promise.all(
    serverCoins.map(async (coinRecord) => {
      const ours = await wallet.hasPuzzleHash(coinRecord.p2PuzzleHash);
      return {
        amount: coinRecord.coin.amount,
        launcher_id: launcherId,
        ours,
        coin_id: Buffer.from(toCoinId(coinRecord.coin)).toString("hex"),
        urls: coinRecord.memoUrls,
      };
    })
  );

  console.log(
    JSON.stringify({
      servers: serverInfo,
    }, null, 2)
  );
};
