/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao),
 * migrated to the modern `context.sourceCode` API.
 */
import { findPropertyByName } from '../utils/find-property-by-name.js';
import { getDeclaredVariable } from '../utils/scope.js';

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				"Use destructuring assignment to access the properties of formState. This ensures the hook has subscribed to the state changes.",
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/destructuring-formstate.md',
		},
		messages: {
			useDestructure: "Use destructuring assignment for formState's properties.",
		},
		schema: [],
	},

	create(context) {
		function checkIsAccessFormStateProperties(node, formStateName) {
			const formStateVar = getDeclaredVariable(context, node, formStateName);
			if (!formStateVar) {
				return;
			}
			for (const reference of formStateVar.references) {
				const { parent } = reference.identifier;
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
				if (
					node.init?.type === 'CallExpression' &&
					(node.init.callee.name === 'useForm' || node.init.callee.name === 'useFormContext')
				) {
					const formStateProperty = findPropertyByName(node, 'formState');
					// Only looking for {formState} or {formState: alias}
					if (formStateProperty?.value.type !== 'Identifier') {
						return;
					}
					checkIsAccessFormStateProperties(node, formStateProperty.value.name);
				} else if (
					node.init?.type === 'CallExpression' &&
					node.init.callee.name === 'useFormState' &&
					node.id.type === 'Identifier'
				) {
					checkIsAccessFormStateProperties(node, node.id.name);
				}
			},
		};
	},
};
