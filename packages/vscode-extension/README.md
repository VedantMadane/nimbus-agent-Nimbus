# Nimbus for VS Code

## What this is

Local-first AI agent for the editor. Ask, search, and run workflows against your private Nimbus index — all running on your machine.

- **Ask** — chat with the Nimbus agent in a side panel; results stream token-by-token.
- **Search** — query your local Nimbus index across every connected service from the command palette.
- **Run Workflow** — trigger pre-defined Nimbus workflows from inside VS Code with HITL consent.

## Install

VS Code Marketplace: `ext install nimbus-agent.nimbus-vscode`
Open VSX (Cursor, VSCodium): `ext install nimbus-agent.nimbus-vscode`
Manual: download the `.vsix` from the GitHub Release and run `code --install-extension nimbus-<ver>.vsix`.

## Quickstart

After installing, click the Nimbus icon in the sidebar or run `Nimbus: Open Chat` from the command palette.

## Requires

A running Nimbus Gateway. See https://nimbus-agent.dev/install for setup.

## See also

- [Nimbus User Guide](https://nimbus-agent.dev/user-guide/vscode-extension/)

## License

MIT
