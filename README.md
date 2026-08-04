# oxlint-plugin-react-hook-form

[react-hook-form](https://react-hook-form.com/) lint rules for [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and ESLint 9+.

This is a port of [eslint-plugin-react-hook-form](https://github.com/andykao1213/eslint-plugin-react-hook-form) (MIT) to the modern ESLint rule API (`context.sourceCode.getScope(node)`). The original plugin uses `context.getScope()`, which ESLint 9 removed — so it crashes under ESLint 9 flat config and under oxlint's JS-plugin runtime. This package runs in both, is written in TypeScript, and ships type declarations.

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
| [destructuring-formstate](docs/rules/destructuring-formstate.md) | Use destructuring assignment to access `formState` properties, so the Proxy subscribes to state changes | |
| [no-access-control](docs/rules/no-access-control.md) | Avoid accessing properties of `control` — they are internal | |
| [no-index-field-array-key](docs/rules/no-index-field-array-key.md) | Use `field.id`, not the array index, as the key when rendering `useFieldArray` fields | |
| [no-nested-object-setvalue](docs/rules/no-nested-object-setvalue.md) | Avoid passing an object as the second argument of `setValue` (use dot-path keys); whole-array `setValue` should be `useFieldArray` methods | 🔧 (objects only) |
| [no-use-watch](docs/rules/no-use-watch.md) | Use `useWatch` instead of `watch`, required for React Compiler correctness | |

The `recommended` config enables everything except `no-use-watch`, which is in the `react-compiler` config.

### Stricter than upstream

Unlike the original plugin, the rules also track the form object itself — `const form = useForm()` followed by `form.formState.x`, `form.control._x`, or `form.setValue(...)` is checked the same as the destructured style, including re-destructuring (`const { setValue } = form`). Whole-array `setValue` gets a dedicated diagnostic (with no autofix) pointing at `useFieldArray`'s `replace`/`append`/`update`, since [the docs deprecate whole-array `setValue`](https://react-hook-form.com/docs/useform/setvalue) for removal in the next major version.

## Credits

Rules originally written by [Chuan-Tse Kao](https://github.com/andykao1213) and contributors in [eslint-plugin-react-hook-form](https://github.com/andykao1213/eslint-plugin-react-hook-form) (`no-use-watch` by tatsuya.asami). This package modernizes them and adds an oxlint-focused test suite.

## License

[MIT](LICENSE)
