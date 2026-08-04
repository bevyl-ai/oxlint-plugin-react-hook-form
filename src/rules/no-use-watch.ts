/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao; rule by
 * tatsuya.asami), migrated to the modern `context.sourceCode` API.
 */
import type { Rule } from 'eslint';

import { findPropertyByName, getDeclaredVariable, isFormHookCall, parentOf } from '../utils/ast.js';

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
		// Variables that were initialized with useForm or useFormContext
		const formContextVars = new Set<string>();

		return {
			VariableDeclarator(node) {
				if (isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					if (node.id.type === 'Identifier') {
						formContextVars.add(node.id.name);

						const formMethodsVar = getDeclaredVariable(context, node, node.id.name);
						if (!formMethodsVar) {
							return;
						}
						for (const reference of formMethodsVar.references) {
							const parent = parentOf(reference.identifier);
							if (
								parent.type === 'MemberExpression' &&
								parent.property.type === 'Identifier' &&
								parent.property.name === 'watch'
							) {
								context.report({
									node: parent.property,
									messageId: 'useUseWatch',
								});
							}
						}
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
					return;
				}

				// Destructuring `watch` from a tracked form context variable
				if (
					node.init?.type === 'Identifier' &&
					formContextVars.has(node.init.name) &&
					node.id.type === 'ObjectPattern'
				) {
					const watchProperty = findPropertyByName(node, 'watch');
					if (watchProperty?.value.type === 'Identifier') {
						context.report({
							node: watchProperty.value,
							messageId: 'useUseWatch',
						});
					}
				}
			},
		};
	},
};

export default rule;
