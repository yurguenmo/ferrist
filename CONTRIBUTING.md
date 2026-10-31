# Contributing to `ferrist`

Thank you for your interest in contributing! `ferrist` aims to bring Rust's algebraic data model, Result, Option, and Try operator to TypeScript with strict type safety and zero runtime dependencies.

---

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yurguenmo/ferrist.git
   cd ferrist
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(This also initializes local git hooks for pre-commit formatting and checks via Biome)*.

---

## Available Scripts

* **`npm run check`**: Runs Biome linting and formatting check across the codebase.
* **`npm run format`**: Automatically formats all files using Biome.
* **`npm run typecheck`**: Runs TypeScript type checking (`tsc --noEmit`).
* **`npm test`**: Runs unit test suites with Vitest.
* **`npm run build`**: Builds ESM, CJS, and DTS bundles with `tsup`.

---

## Commit Guidelines

This project strictly follows [Conventional Commits](https://www.conventionalcommits.org/):

* `feat(...)`: New features or variant behavior.
* `fix(...)`: Bug fixes or type inference corrections.
* `test(...)`: Adding or updating test suites.
* `docs(...)`: Documentation updates.
* `chore(...)`: Tooling, dependency, or configuration updates.

Releases and changelogs are automated using **Release Please** based on these commit messages.
