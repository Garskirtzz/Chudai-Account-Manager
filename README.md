# Chudai Account Manager

A Windows desktop app for managing several Roblox accounts and launching them into the same game or server.

Version 0.9.9. Built with [Tauri 2](https://tauri.app), React 19, Vite, and Tailwind CSS 4.

## Features

- Add accounts by signing in through a private browser window or by pasting a cookie. Cookies are encrypted with Windows DPAPI.
- Launch selected accounts into a game, a specific server (Job ID), a private server, or a friend's server.
- Saved servers: game, Job ID, and private server in one click.
- Resource saver for AFK accounts: lower FPS, low graphics, low process priority, and an optional RAM limit.
- Multi-instance, Fast Flags editor, Roblox client version picker and downloader.
- One-click updates: the installed app checks GitHub Releases, verifies the update's signature, installs it, and restarts.

## Download

Get the latest installer from [Releases](../../releases/latest) (`ChudaiAccountManager_<version>_x64-setup.exe`). Windows SmartScreen may warn because the installer is not code-signed; choose **More info → Run anyway**. After that, updates install from **About → Updates**.

See [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for details and [CHANGELOG.md](CHANGELOG.md) for changes.

## Requirements

- Windows 10 or 11, x64.
- [Node.js](https://nodejs.org) 20+ and [Rust](https://rustup.rs) (stable) to build.

## Build

```
npm install
npm run verify      # lint, web build, UI tests
npm run build       # Windows installer in src-tauri/target/release/bundle/nsis
```
