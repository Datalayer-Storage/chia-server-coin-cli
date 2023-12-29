
# Chia Server Coin CLI

## Description
CLI for creating and managing Server Coins on the Chia Blockchain. This tool is used for discovering Decentralized Internet Gateway Peers.

## Installation

```bash
npm install chia-server-coin-cli -g
```

## Usage
To use this CLI, run it as follows:

```bash
server_coin [command] [options]
```

### Commands:
- `add_server`: Create a Server Coin on the blockchain for a specified data store.
- `delete_server`: Delete a Server Coin on the blockchain for a specified data store.
- `get_server_coins`: Get all Server Coins on the blockchain for a specified data store.

## Command Examples
- Creating a Server Coin:
  ```bash
  server_coin add_server --storeId [Store ID] --amount [Amount] --url [URL] [other options]
  ```

- Deleting a Server Coin:
  ```bash
  server_coin delete_server --coinId [Coin ID] [other options]
  ```

- Getting Server Coins:
  ```bash
  server_coin get_server_coins --storeId [Store ID] [other options]
  ```

## Options
- `--storeId`: Store ID for the data store.
- `--amount`: Amount of mojos to lock up in the Server Coin.
- `--url`: URL of the server.
- `--feeOverride`: Fee override.
- `--fullNodeHost`: Host for your Full Node.
- `--fullNodePort`: Port for your Full Node.
- `--certificateFolderPath`: Path to the certificate SSL folder.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
