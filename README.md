# read receipts

[![Deploy](https://github.com/nhall/read-receipts/actions/workflows/deploy.yml/badge.svg)](https://github.com/nhall/read-receipts/actions/workflows/deploy.yml)
[![Books read](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fnhall.github.io%2Fread-receipts%2Fbooks.json&query=%24.count&label=books%20read&color=222&style=flat)](https://nhall.github.io/read-receipts/)
[![Last refresh](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fnhall.github.io%2Fread-receipts%2Fbooks.json&query=%24.generatedAtDate&label=last%20refresh&color=555&style=flat)](https://nhall.github.io/read-receipts/)

Personal reading log. Auto-refreshed daily from the [Hardcover](https://hardcover.app) API.

→ **[Live site](https://nhall.github.io/read-receipts/)**

## How it works

Hardcover's GraphQL API prohibits browser-side calls, so all reading data is pulled at build time by a Node script, normalized, and written to a static JSON file shipped with the bundle. The frontend is vanilla TypeScript with zero runtime dependencies. GitHub Actions runs the full pipeline on a daily cron, so the site stays current without a server.

## Stack

- Vanilla TypeScript + Vite
- Hardcover GraphQL (build-time only)
- GitHub Actions: scheduled rebuild + Pages deploy
- One typeface (Newsreader), no framework, no client-side network
