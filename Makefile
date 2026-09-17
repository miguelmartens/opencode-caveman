.DEFAULT_GOAL := help

.PHONY: help install test format check pack

help: ## Show available targets
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dev dependencies
	npm install

test: ## Run the test suite
	npm test

format: ## Rewrite files with Prettier
	npm run format

check: ## Run tests and the format check (what CI runs)
	npm test
	npm run format:check

pack: ## Show what the publish tarball would contain
	npm pack --dry-run
