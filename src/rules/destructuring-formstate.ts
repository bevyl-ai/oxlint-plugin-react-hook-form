/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao), migrated to
 * the modern `context.sourceCode` API and extended to track the form object
 * (`const form = useForm(); form.formState.x`), per the react-hook-form
 * formState rules: the Proxy only subscribes to properties that are
 * destructured or read before render.
 */
import type { Rule } from 'eslint';
import type { Node } from 'estree';

import {
	findPropertyByName,
	forEachNamespaceAccess,
	getDeclaredVariable,
	isFormHookCall,
	parentOf,
	sourceMayContain,
} from '../utils/ast.js';

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
		// Every match requires a literal hook-name call (useForm / useFormContext /
		// useFormState), all containing "useForm" — skip whole files cheaply.
		if (!sourceMayContain(context, 'useForm')) {
			return {};
		}
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
					if (node.id.type === 'ObjectPattern') {
						const formStateProperty = findPropertyByName(node, 'formState');
						// Only looking for {formState} or {formState: alias}
						if (formStateProperty?.value.type !== 'Identifier') {
							return;
						}
						checkIsAccessFormStateProperties(node, formStateProperty.value.name);
					} else if (node.id.type === 'Identifier') {
						forEachNamespaceAccess(
							context,
							node as typeof node & { id: typeof node.id },
							'formState',
							(member) => {
								const grandparent = parentOf(member);
								if (grandparent.type === 'MemberExpression') {
									context.report({
										node: grandparent.property,
										messageId: 'useDestructure',
									});
								}
							},
							(property, aliasDeclarator) =>
								checkIsAccessFormStateProperties(aliasDeclarator, property.value.name),
						);
					}
				} else if (isFormHookCall(node.init, ['useFormState']) && node.id.type === 'Identifier') {
					checkIsAccessFormStateProperties(node, node.id.name);
				}
			},
		};
	},
};

export default rule;
