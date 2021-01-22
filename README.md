# Fulcrum Zapier Integration
This project is managed via the [Zapier Platform CLI](https://github.com/zapier/zapier-platform/blob/master/packages/cli/README.md).
[Developer dashboard](https://developer.zapier.com/) can manage the integration as a whole.

## Setup
`npm install -g zapier-platform-cli` install Zapier CLI so you can use the `zapier` command.
`zapier login` using a deploy key which can be found at [Developer dashboard](https://developer.zapier.com/) under your user settings.
This will set you up to interact with Zapier via the Zapier CLI.

## Cheatsheet
`zapier validate` - Validates the local integration.
`zapier delete:version x.x.x` - Deletes a specific version of the integration
`zapier push` - Pushes the local version to Zapier. The version is derived by the version in package.json.
`zapier logs` - Fetches the integration logs from Zapier.
`zapier --help` - Lists Zapier CLI commands.