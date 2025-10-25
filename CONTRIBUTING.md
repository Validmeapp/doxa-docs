# Contributing to Multilingual Documentation Portal

Thank you for your interest in contributing to the Multilingual Documentation Portal! We welcome contributions from the community while maintaining the project's licensing requirements.

## License and Legal Requirements

This project is licensed under the **Commons Clause + Apache 2.0** license. By contributing to this project, you agree that:

1. **Your contributions will be licensed under the same terms** as the project (Commons Clause + Apache 2.0)
2. **You have the right to submit your contributions** under these terms
3. **You understand the commercial restrictions** imposed by the Commons Clause
4. **Validme LLC retains copyright** over the project and all contributions

### What the License Means for Contributors

- ✅ **You can**: Use, modify, and distribute the software for non-commercial purposes
- ✅ **You can**: Create derivative works and contribute improvements
- ✅ **You can**: Use the software for internal business purposes
- ❌ **You cannot**: Sell the software or offer it as a commercial service
- ❌ **You cannot**: Charge fees for hosting, consulting, or support services based on this software

## How to Contribute

### 1. Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

### 2. Types of Contributions

We welcome the following types of contributions:

- **Bug fixes** - Help us identify and fix issues
- **Feature enhancements** - Improve existing functionality
- **Documentation improvements** - Better docs, examples, and guides
- **Performance optimizations** - Make the portal faster and more efficient
- **Accessibility improvements** - Ensure the portal works for everyone
- **Internationalization** - Add support for new languages
- **Testing** - Improve test coverage and quality

### 3. Getting Started

#### Prerequisites

- Node.js 18+ and npm
- Git
- Basic knowledge of Next.js, TypeScript, and React

#### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/your-username/multilingual-docs-portal.git
cd multilingual-docs-portal

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests and linting
npm run lint
npm run type-check
```

### 4. Development Workflow

#### Before You Start

1. **Check existing issues** - Look for existing issues or discussions
2. **Create an issue** - For new features or significant changes, create an issue first
3. **Get approval** - Wait for maintainer approval before starting work on large features

#### Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow coding standards**:
   - Use TypeScript for all new code
   - Follow the existing code style and patterns
   - Add JSDoc comments for public APIs
   - Ensure accessibility compliance (WCAG 2.1 AA)

3. **Write tests** when applicable:
   - Add unit tests for new functions
   - Test components with different props and states
   - Ensure existing tests still pass

4. **Update documentation**:
   - Update README.md if needed
   - Add JSDoc comments
   - Update relevant documentation files

#### Code Quality Requirements

- **Linting**: Code must pass ESLint checks (`npm run lint`)
- **Type checking**: Code must pass TypeScript checks (`npm run type-check`)
- **Formatting**: Use Prettier for consistent formatting (`npm run format`)
- **Performance**: Ensure changes don't negatively impact performance
- **Accessibility**: Follow WCAG 2.1 AA guidelines

### 5. Submitting Changes

#### Pull Request Process

1. **Commit your changes** with clear, descriptive messages:
   ```bash
   git commit -m "feat: add support for RTL languages"
   ```

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Test instructions

#### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

## Related Issues
Fixes #(issue number)

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### 6. Review Process

1. **Automated checks** must pass (linting, type checking, tests)
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** and merge by maintainers

## Contribution Guidelines

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(search): add fuzzy search functionality`
- `fix(sidebar): resolve navigation accessibility issue`
- `docs(api): update authentication examples`

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Use semantic HTML elements
- Ensure responsive design

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Update relevant documentation files
- Add JSDoc comments for public APIs
- Ensure examples are tested and working

## Community and Support

### Getting Help

- **Issues**: Create an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact maintainers at [contacto@validme.tech](mailto:contacto@validme.tech) for sensitive matters

### Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- Project documentation

## Legal Notes

### Contributor License Agreement

By submitting a contribution, you agree that:

1. Your contribution is your original work or you have rights to submit it
2. You grant Validme LLC a perpetual, worldwide, royalty-free license to use your contribution
3. Your contribution will be subject to the project's Commons Clause + Apache 2.0 license
4. You understand that Validme LLC may relicense the project in the future

### Commercial Use Restrictions

Remember that this project is subject to the Commons Clause, which means:
- You cannot sell the software or offer it as a commercial service
- You cannot charge for hosting, consulting, or support services based on this software
- Commercial licensing may be available separately from Validme LLC

### Questions About Licensing

If you have questions about the licensing terms or need commercial licensing, please contact:

**Validme LLC**  
📧 Email: [contacto@validme.tech](mailto:contacto@validme.tech)  
🌐 Website: [https://validme.tech](https://validme.tech)  
📍 Address: 254 Chapman Rd, Ste 208#19266, Newark, Delaware 19702, US  

---

Thank you for contributing to the Multilingual Documentation Portal! Your contributions help make documentation more accessible to developers worldwide.