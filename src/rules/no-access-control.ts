/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao), migrated to
 * the modern `context.sourceCode` API and extended to track the form object
 * (`const form = useForm(); form.control._x`). Passing `control` around
 * (e.g. to useController/useFieldArray) stays allowed; only property access
 * on it is flagged.
 */
import type { Rule } from 'eslint';
import type { Node } from 'estree';

import {
	findPropertyByName,
	forEachNamespaceAccess,
	getDeclaredVariable,
	isFormHookCall,
	parentOf,
} from '../utils/ast.js';

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
		function checkControlReferences(node: Node, controlName: string): void {
			const controlVar = getDeclaredVariable(context, node, controlName);
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
		}

		return {
			VariableDeclarator(node) {
				if (!isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					return;
				}
				if (node.id.type === 'ObjectPattern') {
					const controlProperty = findPropertyByName(node, 'control');
					// Only looking for {control} or {control: alias}
					if (controlProperty?.value.type !== 'Identifier') {
						return;
					}
					checkControlReferences(node, controlProperty.value.name);
				} else if (node.id.type === 'Identifier') {
					forEachNamespaceAccess(
						context,
						node as typeof node & { id: typeof node.id },
						'control',
						(member) => {
							const grandparent = parentOf(member);
							if (grandparent.type === 'MemberExpression') {
								context.report({
									node: grandparent.property,
									messageId: 'noAccessControl',
								});
							}
						},
						(property, aliasDeclarator) =>
							checkControlReferences(aliasDeclarator, property.value.name),
					);
				}
			},
		};
	},
};

export default rule;
