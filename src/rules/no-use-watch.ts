/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao; rule by
 * tatsuya.asami), migrated to the modern `context.sourceCode` API. Form-object
 * tracking is scope-resolved (upstream used a file-global name set, which
 * cross-contaminated unrelated bindings of the same name in other components).
 */
import { findPropertyByName, forEachNamespaceAccess, isFormHookCall, sourceMayContain } from '../utils/ast.js';
import type { CreateOnceRule } from '../utils/rule.js';

const rule: CreateOnceRule = {
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

	createOnce(context) {
		return {
			before() {
				// Every match requires a literal hook-name call (useForm / useFormContext /
				// useFormState), all containing "useForm" — skip whole files cheaply.
				if (!sourceMayContain(context, 'useForm')) {
					return false;
				}
			},
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
