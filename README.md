# Team Squared App

Frontend application for the Team Squared CS 514 database product project.

## Responsibilities

- React/Next.js user interface
- User-facing football analytics and prediction views
- Communication with `team-squared-service` through HTTP/JSON APIs
- Client-side presentation, interaction, loading, and error states

## Architecture

This repository owns frontend code only.

Backend business logic, persistence, database migrations, seed data, and external data-provider integrations belong in `team-squared-service`.

The existing `RoadToTheFinal` Flask/Jinja application is the legacy reference implementation. Features will be migrated incrementally rather than deleting or modifying the legacy application before parity is verified.

## Local development

Use Node.js 20.9 or newer and npm. Run all commands from this repository root.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to change the homepage.

The app uses Next.js App Router, strict TypeScript, Tailwind CSS, and ESLint.
The `@/*` import alias maps to `src/*`. Static assets live in `public/`.
Dependencies, configuration, and build output all live in this repository.

## Checks and production

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

Stop the development server before running `npm start`; both use port 3000.
The initial scaffold does not yet connect to `team-squared-service`.
