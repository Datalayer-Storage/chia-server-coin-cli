#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
const api_1 = require("./api");
const clvm_lib_1 = require("clvm-lib");
const commands = {
    createServerCoin: {
        command: "add_server",
        desc: "Creates a Server Coin on the blockchain for the specified datalayer store",
        builder: (yargs) => yargs
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
            .option("certificateFolderPath", {
            describe: "Path to the certificate ssl folder",
            type: "string",
        }),
        handler: async (argv) => {
            try {
                await (0, api_1.createServerCoin)(clvm_lib_1.Program.fromHex(argv.storeId), [clvm_lib_1.Program.fromText(argv.url)], argv.amount, {
                    feeOverride: argv.fee,
                    fullNodeHost: argv.fullNodeHost,
                    fullNodePort: argv.fullNodePort,
                    certificateFolderPath: argv.certificateFolderPath,
                });
            }
            catch (error) {
                console.error("Error:", error.message);
            }
        },
    },
    deleteServerCoin: {
        command: "delete_server",
        desc: "Deletes a Server Coin on the blockchain for the specified datalayer store",
        builder: (yargs) => yargs
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
            .option("certificateFolderPath", {
            describe: "Path to the certificate ssl folder",
            type: "string",
        }),
        handler: async (argv) => {
            try {
                await (0, api_1.deleteServerCoin)(argv.coinId, {
                    feeOverride: argv.feeOverride,
                    fullNodeHost: argv.fullNodeHost,
                    fullNodePort: argv.fullNodePort,
                    certificateFolderPath: argv.certificateFolderPath,
                });
            }
            catch (error) {
                console.error("Error:", error.message);
            }
        },
    },
    getServerCoinsByLauncherId: {
        command: "get_server_coins",
        desc: "Gets all Server Coins on the blockchain for the specified datalayer store",
        builder: (yargs) => yargs
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
            .option("certificateFolderPath", {
            describe: "Path to the certificate ssl folder",
            type: "string",
        }),
        handler: async (argv) => {
            try {
                await (0, api_1.getServerCoinsByLauncherId)(clvm_lib_1.Program.fromHex(argv.storeId), {
                    fullNodeHost: argv.fullNodeHost,
                    fullNodePort: argv.fullNodePort,
                    certificateFolderPath: argv.certificateFolderPath
                });
            }
            catch (error) {
                console.error("Error:", error.message);
            }
        },
    },
};
async function run() {
    const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .command(commands.createServerCoin)
        .command(commands.deleteServerCoin)
        .command(commands.getServerCoinsByLauncherId)
        .demandCommand(1, "You need at least one command before moving on")
        .help()
        .alias("h", "help")
        .parse();
}
run();
