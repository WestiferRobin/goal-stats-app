# GoalStats frontend public developer interface.
ifeq ($(OS),Windows_NT)
BASH := C:/Progra~1/Git/bin/bash.exe
else
BASH := /bin/bash
endif
.DEFAULT_GOAL := help

.PHONY: setup run test stop help
setup run stop:
	@$(BASH) scripts/develop.sh $@

test:
	@$(BASH) scripts/test.sh contributor

help:
	@$(BASH) scripts/develop.sh help

# Internal maintainer capabilities; intentionally absent from make help.
.PHONY: _logs _e2e _test-home _build-production
_logs:
	@$(BASH) scripts/develop.sh logs
_e2e:
	@$(BASH) scripts/test.sh e2e
_test-home:
	@$(BASH) scripts/test-home.sh
_build-production:
	@docker build --target runtime -t goal-stats-app:runtime .
