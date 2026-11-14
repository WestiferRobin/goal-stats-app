ARG NORMALIZED_SERVICE_IMAGE=goal-stats-service:runtime
FROM ${NORMALIZED_SERVICE_IMAGE} AS service
FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS node
FROM service AS normalized
USER root
HEALTHCHECK NONE
COPY --from=node /usr/local/ /usr/local/
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 PYTHONPATH=/service/src PYTHONDONTWRITEBYTECODE=1
# Copy the pristine backend stage separately from the frontend overlay.
COPY --from=service /app/ /service/
CMD ["bash", "scripts/normalized/run.sh"]
