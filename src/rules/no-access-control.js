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
			description: 'Avoid accessing the properties of control',
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/no-access-control.md',
		},
		messages: {
			noAccessControl: "Do not access the properties of `control`. They're for internal usage.",
		},
		schema: [],
	},

	create(context) {
		return {
			VariableDeclarator(node) {
				if (
					node.init?.type !== 'CallExpression' ||
					(node.init.callee.name !== 'useForm' && node.init.callee.name !== 'useFormContext')
				) {
					return;
				}
				const controlProperty = findPropertyByName(node, 'control');
				// Only looking for {control} or {control: alias}
				if (controlProperty?.value.type !== 'Identifier') {
					return;
				}
				const controlVar = getDeclaredVariable(context, node, controlProperty.value.name);
				if (!controlVar) {
					return;
				}
				for (const reference of controlVar.references) {
					const { parent } = reference.identifier;
					if (parent.type === 'MemberExpression') {
						context.report({
							node: parent.property,
							messageId: 'noAccessControl',
						});
					}
				}
			},
		};
	},
};
