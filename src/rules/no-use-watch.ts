/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao; rule by
 * tatsuya.asami), migrated to the modern `context.sourceCode` API. Form-object
 * tracking is scope-resolved (upstream used a file-global name set, which
 * cross-contaminated unrelated bindings of the same name in other components).
 */
import type { Rule } from 'eslint';

import { findPropertyByName, forEachNamespaceAccess, isFormHookCall } from '../utils/ast.js';

const rule: Rule.RuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Use useWatch instead of watch. This ensures the hook has subscribed to the state changes when using React Compiler',
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/no-use-watch.md',
		},
		messages: {
			useUseWatch: 'Use useWatch instead of watch.',
		},
		schema: [],
	},

	create(context) {
		// Every match requires a literal hook-name call (useForm / useFormContext /
		// useFormState), all containing "useForm" — skip whole files cheaply.
		if (!context.sourceCode.text.includes('useForm')) {
			return {};
		}
		return {
			VariableDeclarator(node) {
				if (!isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					return;
				}
				if (node.id.type === 'Identifier') {
					forEachNamespaceAccess(
						context,
						node as typeof node & { id: typeof node.id },
						'watch',
						(member) => {
							context.report({
								node: member.property,
								messageId: 'useUseWatch',
							});
						},
						(property) => {
							context.report({
								node: property.value,
								messageId: 'useUseWatch',
							});
						},
					);
				} else {
					const watchProperty = findPropertyByName(node, 'watch');
					// Only looking for {watch} or {watch: alias}
					if (watchProperty?.value.type !== 'Identifier') {
						return;
					}
					context.report({
						node: watchProperty.value,
						messageId: 'useUseWatch',
					});
				}
			},
		};
	},
};

export default rule;
