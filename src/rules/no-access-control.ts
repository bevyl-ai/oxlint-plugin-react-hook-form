/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao),
 * migrated to the modern `context.sourceCode` API.
 */
import type { Rule } from 'eslint';

import { findPropertyByName, getDeclaredVariable, isFormHookCall, parentOf } from '../utils/ast.js';

const rule: Rule.RuleModule = {
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
				if (!isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
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
					const parent = parentOf(reference.identifier);
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

export default rule;
