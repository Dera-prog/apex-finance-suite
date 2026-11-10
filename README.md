# Apex Finance

A four-surface product suite for a fictional Nigerian savings-and-investing app: a design case study, a marketing site, a desktop web app, and a mobile PWA. All four are live, built from this npm-workspaces monorepo, and share one design-token layer.

## Live links

| Surface | URL | What it is |
| --- | --- | --- |
| Case study | [apex-finance-case-study.vercel.app](https://apex-finance-case-study.vercel.app) | The design case study: problem, process, decisions and outcomes |
| Website | [apex-finance-website.vercel.app](https://apex-finance-website.vercel.app) | Marketing site for the product |
| Desktop app | [apex-finance-desktop.vercel.app](https://apex-finance-desktop.vercel.app) | Desktop web app demo |
| Mobile PWA | [apex-finance-mobile.vercel.app](https://apex-finance-mobile.vercel.app) | Installable mobile app demo |

The demo apps accept any phone number, use demo code `123456` for OTP, and any 4-digit PIN. No real money moves.

## Repository layout

```
apps/case-study   design case study
apps/website      marketing site
apps/desktop      desktop web app
apps/mobile       mobile PWA
packages/shared   shared design tokens, components and links
```

## Run locally

Requires Node 20+ and npm.

```bash
npm install
npm run dev:case      # case study
npm run dev:site      # marketing site
npm run dev:desktop   # desktop app
npm run dev:mobile    # mobile app
```

## Build

```bash
npm run build           # all four surfaces
npm run build:case
npm run build:site
npm run build:desktop
npm run build:mobile
```

Each app builds to its own `dist/` directory and deploys to Vercel as a static site.
