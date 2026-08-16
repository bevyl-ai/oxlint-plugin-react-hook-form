import { eslintCompatPlugin, type Plugin } from '@oxlint/plugins';
import type { ESLint, Linter } from 'eslint';

import destructuringFormstate from './rules/destructuring-formstate.js';
import noAccessControl from './rules/no-access-control.js';
import noIndexFieldArrayKey from './rules/no-index-field-array-key.js';
import noNestedObjectSetvalue from './rules/no-nested-object-setvalue.js';
import noUseWatch from './rules/no-use-watch.js';

const plugin = eslintCompatPlugin({
	meta: {
		name: 'react-hook-form',
	},
	rules: {
		'destructuring-formstate': destructuringFormstate,
		'no-access-control': noAccessControl,
		'no-index-field-array-key': noIndexFieldArrayKey,
		'no-nested-object-setvalue': noNestedObjectSetvalue,
		'no-use-watch': noUseWatch,
	},
} as unknown as Plugin) as unknown as ESLint.Plugin & {
	configs: Record<'recommended' | 'react-compiler', Linter.Config>;
};

// Flat configs for ESLint 9+. Oxlint users enable the rules in .oxlintrc.json.
plugin.configs = {
	recommended: {
		plugins: { 'react-hook-form': plugin },
		rules: {
			'react-hook-form/destructuring-formstate': 'error',
			'react-hook-form/no-access-control': 'error',
			'react-hook-form/no-index-field-array-key': 'error',
			'react-hook-form/no-nested-object-setvalue': 'error',
		},
	},
	'react-compiler': {
		plugins: { 'react-hook-form': plugin },
		rules: {
			'react-hook-form/no-use-watch': 'error',
		},
	},
};

export default plugin;
