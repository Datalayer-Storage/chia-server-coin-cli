import { bytesEqual, toCoinId } from "server-coin";
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

  console.log(await wallet.derivationIndex());

  console.log(
    await wallet.createServerCoin(
      stringToUint8Array(launcherId),
      amount,
      options?.feeOverride || constants.defaultFeeAmountInMojo,
      urls
    )
  );
};

export const deleteServerCoin = async (coinId: string, options?: Options) => {
  const peer = await getPeer(options);
  const wallet = await getWallet(peer, options);

  const serverCoins = await peer.fetchServerCoins(
    stringToUint8Array(coinId),
    100
  );

  const serverCoin = serverCoins.find((sc) =>
    bytesEqual(toCoinId(sc.coin), stringToUint8Array(coinId))
  );

  if (!serverCoin) {
    throw new Error("Coin not found.");
  }

  await wallet.deleteServerCoins(
    [serverCoin.coin],
    options?.feeOverride || constants.defaultFeeAmountInMojo
  );

  console.log(`Deleted coin ${coinId}`);
};

export const getServerCoinsByLauncherId = async (launcherId: String, options?: Options) => {
  const peer = await getPeer(options);
  const coins = await peer.fetchServerCoins(
    stringToUint8Array(launcherId),
    100
  );

  const wallet = await getWallet(peer, options);

  const serverCoins = await Promise.all(
    coins.map(async (coinRecord) => {
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
      servers: serverCoins,
    }, null, 2)
  );
};
