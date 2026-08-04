import type { ESLint, Linter } from 'eslint';

import destructuringFormstate from './rules/destructuring-formstate.js';
import noAccessControl from './rules/no-access-control.js';
import noNestedObjectSetvalue from './rules/no-nested-object-setvalue.js';
import noUseWatch from './rules/no-use-watch.js';

const plugin = {
	meta: {
		name: 'react-hook-form',
	},
	rules: {
		'destructuring-formstate': destructuringFormstate,
		'no-access-control': noAccessControl,
		'no-nested-object-setvalue': noNestedObjectSetvalue,
		'no-use-watch': noUseWatch,
	},
	configs: {} as Record<'recommended' | 'react-compiler', Linter.Config>,
} satisfies ESLint.Plugin;

// Flat configs for ESLint 9+. Oxlint users enable the rules in .oxlintrc.json.
plugin.configs.recommended = {
	plugins: { 'react-hook-form': plugin },
	rules: {
		'react-hook-form/destructuring-formstate': 'error',
		'react-hook-form/no-access-control': 'error',
		'react-hook-form/no-nested-object-setvalue': 'error',
	},
};
plugin.configs['react-compiler'] = {
	plugins: { 'react-hook-form': plugin },
	rules: {
		'react-hook-form/no-use-watch': 'error',
	},
};

export default plugin;
