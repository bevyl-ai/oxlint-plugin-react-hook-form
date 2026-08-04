# oxlint-plugin-react-hook-form

[react-hook-form](https://react-hook-form.com/) lint rules for [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and ESLint 9+.

This is a port of [eslint-plugin-react-hook-form](https://github.com/andykao1213/eslint-plugin-react-hook-form) (MIT) to the modern ESLint rule API (`context.sourceCode.getScope(node)`). The original plugin uses `context.getScope()`, which ESLint 9 removed — so it crashes under ESLint 9 flat config and under oxlint's JS-plugin runtime. This package runs in both.

## Install

```sh
npm install --save-dev oxlint-plugin-react-hook-form
```

## Usage with oxlint

`.oxlintrc.json`:

```json
{
  "jsPlugins": ["oxlint-plugin-react-hook-form"],
  "rules": {
    "react-hook-form/destructuring-formstate": "error",
    "react-hook-form/no-access-control": "error",
    "react-hook-form/no-nested-object-setvalue": "error",
    "react-hook-form/no-use-watch": "error"
  }
}
```

Requires oxlint ≥ 1.x with JS plugin support.

## Usage with ESLint 9 (flat config)

```js
import reactHookForm from 'oxlint-plugin-react-hook-form';

export default [
  reactHookForm.configs.recommended,
  // reactHookForm.configs['react-compiler'], // adds no-use-watch
];
```

Or enable rules individually:

```js
import reactHookForm from 'oxlint-plugin-react-hook-form';

export default [
  {
    plugins: { 'react-hook-form': reactHookForm },
    rules: {
      'react-hook-form/destructuring-formstate': 'error',
    },
  },
];
```

## Rules

| Rule | Description | Fixable |
| --- | --- | --- |
| [destructuring-formstate](docs/rules/destructuring-formstate.md) | Use destructuring assignment to access `formState` properties, so the hook subscribes to state changes | |
| [no-access-control](docs/rules/no-access-control.md) | Avoid accessing properties of `control` — they are internal | |
| [no-nested-object-setvalue](docs/rules/no-nested-object-setvalue.md) | Avoid passing an object or array as the second argument of `setValue`; use dot-path keys instead | 🔧 |
| [no-use-watch](docs/rules/no-use-watch.md) | Use `useWatch` instead of `watch`, required for React Compiler correctness | |

The `recommended` config enables the first three. `no-use-watch` is in the `react-compiler` config.

## Credits

Rules originally written by [Chuan-Tse Kao](https://github.com/andykao1213) and contributors in [eslint-plugin-react-hook-form](https://github.com/andykao1213/eslint-plugin-react-hook-form) (`no-use-watch` by tatsuya.asami). This package modernizes them and adds an oxlint-focused test suite.

## License

[MIT](LICENSE)
