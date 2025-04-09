
<p align="center">
  <a href="https://ethfollow.xyz" target="_blank" rel="noopener noreferrer">
    <img width="275" src="https://docs.efp.app/logo.png" alt="EFP logo" />
  </a>
</p>
<br />
<p align="center">
  <a href="https://pr.new/ethereumfollowprotocol/follow-bot"><img src="https://developer.stackblitz.com/img/start_pr_dark_small.svg" alt="Start new PR in StackBlitz Codeflow" /></a>
  <a href="https://discord.ethfollow.xyz"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat" /></a>
  <a href="https://x.com/efp"><img src="https://img.shields.io/twitter/follow/efp?label=%40efp&style=social&link=https%3A%2F%2Fx.com%2Fefp" alt="x account" /></a>
</p>

<h1 align="center" style="font-size: 2.75rem; font-weight: 900; color: white;">EFP Follow Bot</h1>

The **EFP Follow Bot** enables users to subscribe to Ethereum addresses or ENS names, allowing them to stay updated with the latest follows, tags, and other activities within the Ethereum Follow Protocol (EFP) ecosystem. This bot simplifies tracking and engagement, making it easier for users to stay informed about their favorite EFP accounts.

## Important links

- Documentation: [**docs.efp.app/**](https://docs.efp.app/)

## Getting started with development

### Prerequisites

- [Bun runtime](https://bun.sh/) (latest version)
- [Node.js](https://nodejs.org/en/) (LTS which is currently 20)
- [Redis](https://redis.io/) This bot requires a redis instance to store subscription data

### Installation

```bash
git clone https://github.com/ethereumfollowprotocol/follow-bot.git && cd follow-bot
```

> [!NOTE]
> If vscode extensions behave weirdly or you stop getting type hints, run CMD+P and type `> Developer: Restart Extension Host` to restart the extension host.

```bash
# upgrade bun to make sure you have the latest version then install dependencies
bun upgrade && bun install
```

### Environment Variables

```bash
cp .env-example .env
```

### Start

```bash
bun run start
```
<br />

Follow [**@efp**](https://x.com/efp) on **𝕏** for updates!