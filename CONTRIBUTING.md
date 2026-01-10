# Contributing to Predicte

Thank you for your interest in contributing to Predicte! We welcome contributions from the community to help make AI-powered coding accessible to everyone.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/predicte.git
    cd predicte
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```

## Development Workflow

1.  **Create a new branch** for your feature or fix:
    ```bash
    git checkout -b feature/my-awesome-feature
    ```
2.  **Make your changes**.
3.  **Run tests** to ensure everything is working:
    ```bash
    npm test
    ```
4.  **Lint and Format** your code:
    ```bash
    npm run lint
    npm run format
    ```

## Project Structure

- `src/extension.ts`: Main entry point.
- `src/managers/`: State and configuration management.
- `src/providers/`: VS Code completion providers.
- `src/services/`: External API services (Mistral).
- `src/utils/`: Helper functions.

## Committing Changes

Please follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: ...` for new features
- `fix: ...` for bug fixes
- `docs: ...` for documentation changes

## Pull Request Process

1.  Push your branch to GitHub.
2.  Open a Pull Request against the `main` branch.
3.  Describe your changes clearly.
4.  Wait for review!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
