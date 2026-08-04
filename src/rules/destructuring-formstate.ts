/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao),
 * migrated to the modern `context.sourceCode` API.
 */
import type { Rule } from 'eslint';
import type { Node } from 'estree';

import { findPropertyByName, getDeclaredVariable, isFormHookCall, parentOf } from '../utils/ast.js';

const rule: Rule.RuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Use destructuring assignment to access the properties of formState. This ensures the hook has subscribed to the state changes.',
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/destructuring-formstate.md',
		},
		messages: {
			useDestructure: "Use destructuring assignment for formState's properties.",
		},
		schema: [],
	},

	create(context) {
		function checkIsAccessFormStateProperties(node: Node, formStateName: string): void {
			const formStateVar = getDeclaredVariable(context, node, formStateName);
			if (!formStateVar) {
				return;
			}
			for (const reference of formStateVar.references) {
				const parent = parentOf(reference.identifier);
				if (parent.type === 'MemberExpression') {
					context.report({
						node: parent.property,
						messageId: 'useDestructure',
					});
				}
			}
		}

		return {
			VariableDeclarator(node) {
				if (isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					const formStateProperty = findPropertyByName(node, 'formState');
					// Only looking for {formState} or {formState: alias}
					if (formStateProperty?.value.type !== 'Identifier') {
						return;
					}
					checkIsAccessFormStateProperties(node, formStateProperty.value.name);
				} else if (isFormHookCall(node.init, ['useFormState']) && node.id.type === 'Identifier') {
					checkIsAccessFormStateProperties(node, node.id.name);
				}
			},
		};
	},
};

export default rule;
