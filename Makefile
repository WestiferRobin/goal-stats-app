# GNU Make 3.81+ and Bash on macOS/Linux.
SHELL := /bin/bash
.DEFAULT_GOAL := help
ENV ?= local
E2E ?= false
PROJECT ?=
export ENV E2E PROJECT
.PHONY: help setup build run stop logs unit test
help:
	@printf '%s\n' \
	  'SETUP' \
	  '  make help                    Show standalone frontend commands' \
	  '  make setup                   Check Docker/Compose/Make; start nothing' \
	  '' 'BUILD / RUN' \
	  '  make build [ENV=local|dev]    Build selected runnable image' \
	  '  make run [ENV=local|dev]      Build/start app; wait for HTTP readiness' \
	  '  make stop [ENV=local|dev]     Stop only selected app project' \
	  '  make logs [ENV=local|dev]     Follow app logs until interrupted' \
	  '' 'TEST' \
	  '  make unit                    Source unit/component tests only' \
	  '  make test [E2E=false]        Source unit/component tests; default false' \
	  '  make test E2E=true           Source tests, then isolated browser E2E' \
	  '' 'ENV defaults to local. LOCAL: source-mounted developer container + HMR.' \
	  'DEV: built container + production-style startup. No host Node required.' \
	  'Advanced npm/Docker commands and port overrides: docs/DEVELOPMENT.md.'
setup build run stop logs:
	@bash scripts/develop.sh "$@" "$${ENV}" "$${PROJECT}"
unit test:
	@bash scripts/test.sh "$@" "$${E2E}"
