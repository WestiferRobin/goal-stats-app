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
