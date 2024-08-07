#!/usr/bin/env node

import { Arguments, Argv } from "yargs";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import {
  createServerCoin,
  deleteServerCoin,
  getServerCoinsByLauncherId
} from "./api";
import { Options, getPeer, getWallet } from "./utils";

interface ServerCoinCommandArguments {
  storeId: string;
  url: string;
  amount?: number;
  options?: Options;
}

interface DeleteServerCoinCommandArguments {
  storeId: string;
  coinId: string;
  options?: Options;
}

interface GetServerCoinsCommandArguments {
  storeId: string;
  options?: Options;
}

const commands = {
  createServerCoin: {
    command: "add_server",
    desc: "Creates a Server Coin on the blockchain for the specified datalayer store",
    builder: (yargs: Argv) =>
      yargs
        .option("storeId", {
          describe: "Store ID you want to create a server coin for",
          type: "string",
          demandOption: true,
        })
        .option("amount", {
          describe: "Amount of mojos to lock up in the server coin",
          type: "number",
        })
        .option("url", {
          describe: "URL of the server",
          type: "string",
          demandOption: true,
        })
        .option("fee", {
          describe: "Fee Override",
          type: "number",
        })
        .option("fullNodeHost", {
          describe: "Host for your Full Node",
          type: "string",
        })
        .option("fullNodePort", {
          describe: "Port for your Full Node",
          type: "number",
        })
        .option("walletHost", {
          describe: "Host for your Wallet RPC",
          type: "string",
        })
        .option("walletPort", {
          describe: "Port for your Wallet RPC",
          type: "number",
        })
        .option("certificateFolderPath", {
          describe: "Path to the certificate ssl folder",
          type: "string",
        })
        .option("verbose", {
          describe: "Extra logging for debugging purposes",
          type: "string",
        })
        .option("autoFindPeer", {
          describe: "Automatically find a peer to connect to",
          type: "boolean",
        }),
    handler: async (argv: Arguments<ServerCoinCommandArguments>) => {
      try {
        await createServerCoin(
          argv.storeId,
          [argv.url],
          argv.amount,
          {
            feeOverride: argv.fee as number,
            fullNodeHost: argv.fullNodeHost as string,
            fullNodePort: argv.fullNodePort as number,
            certificateFolderPath: argv.certificateFolderPath as string,
            walletHost: argv.walletHost as string,
            walletPort: argv.walletPort as number,
            verbose: argv.verbose as boolean,
            autoFindPeer: argv.autoFindPeer as boolean
          }
        );
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    },
  },
  deleteServerCoin: {
    command: "delete_server",
    desc: "Deletes a Server Coin on the blockchain for the specified datalayer store",
    builder: (yargs: Argv) =>
      yargs
        .option("storeId", {
          describe: "Store ID",
          type: "string",
          demandOption: true,
        })
        .option("coinId", {
          describe: "Coin ID",
          type: "string",
          demandOption: true,
        })
        .option("feeOverride", {
          describe: "Fee Override",
          type: "number",
        })
        .option("fullNodeHost", {
          describe: "Host for your Full Node",
          type: "string",
        })
        .option("fullNodePort", {
          describe: "Port for your Full Node",
          type: "number",
        })
        .option("walletHost", {
          describe: "Host for your Wallet RPC",
          type: "string",
        })
        .option("walletPort", {
          describe: "Port for your Wallet RPC",
          type: "number",
        })
        .option("certificateFolderPath", {
          describe: "Path to the certificate ssl folder",
          type: "string",
        })
        .option("verbose", {
          describe: "Extra logging for debugging purposes",
          type: "boolean",
        })
        .option("autoFindPeer", {
          describe: "Automatically find a peer to connect to",
          type: "boolean",
        }),
    handler: async (argv: Arguments<DeleteServerCoinCommandArguments>) => {
      try {
        await deleteServerCoin(argv.storeId, argv.coinId, {
          feeOverride: argv.feeOverride as number,
          fullNodeHost: argv.fullNodeHost as string,
          fullNodePort: argv.fullNodePort as number,
          certificateFolderPath: argv.certificateFolderPath as string,
          walletHost: argv.walletHost as string,
          walletPort: argv.walletPort as number,
          verbose: argv.verbose as boolean,
          autoFindPeer: argv.autoFindPeer as boolean
        });
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    },
  },
  getServerCoinsByLauncherId: {
    command: "get_server_coins",
    desc: "Gets all Server Coins on the blockchain for the specified datalayer store",
    builder: (yargs: Argv) =>
      yargs
        .option("storeId", {
          describe: "The store ID you want to find the server coins for",
          type: "string",
          demandOption: true,
        })
        .option("fullNodeHost", {
          describe: "Host for your Full Node",
          type: "string",
        })
        .option("fullNodePort", {
          describe: "Port for your Full Node",
          type: "number",
        })
        .option("walletHost", {
          describe: "Host for your Wallet RPC",
          type: "string",
        })
        .option("walletPort", {
          describe: "Port for your Wallet RPC",
          type: "number",
        })
        .option("certificateFolderPath", {
          describe: "Path to the certificate ssl folder",
          type: "string",
        })
        .option("verbose", {
          describe: "Extra logging for debugging purposes",
          type: "boolean",
        })
        .option("autoFindPeer", {
          describe: "Automatically find a peer to connect to",
          type: "boolean",
        }),
    handler: async (argv: Arguments<GetServerCoinsCommandArguments>) => {
      try {
        await getServerCoinsByLauncherId(argv.storeId, {
          feeOverride: argv.feeOverride as number,
          fullNodeHost: argv.fullNodeHost as string,
          fullNodePort: argv.fullNodePort as number,
          certificateFolderPath: argv.certificateFolderPath as string,
          walletHost: argv.walletHost as string,
          walletPort: argv.walletPort as number,
          verbose: argv.verbose as boolean,
          autoFindPeer: argv.autoFindPeer as boolean
        });
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    },
  },
};

async function run() {
  const argv = yargs(hideBin(process.argv))
    .command(commands.createServerCoin)
    .command(commands.deleteServerCoin)
    .command(commands.getServerCoinsByLauncherId)
    .demandCommand(1, "You need at least one command before moving on")
    .help()
    .alias("h", "help")
    .parse();
}

run();

export default {
  getPeer,
  getWallet,
  createServerCoin,
  deleteServerCoin,
  getServerCoinsByLauncherId,
};
