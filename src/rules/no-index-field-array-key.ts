/**
 * From the react-hook-form useFieldArray rules: `field.id` (and not the array
 * index) must be used as the component key, otherwise re-renders break field
 * state when items are added, removed, or reordered.
 */
import type { Expression, Identifier, Node, Super } from 'estree';

import {
	collectIdentifiers,
	isFormHookCall,
	parentOf,
	resolveDeclarator,
	resolveVariable,
	sourceMayContain,
} from '../utils/ast.js';
import type { CreateOnceRule } from '../utils/rule.js';

interface JsxAttribute {
	type: 'JSXAttribute';
	name: { type: string; name?: string };
	value: { type: string; expression?: Expression } | null;
}

const rule: CreateOnceRule = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Use field.id, not the array index, as the key when rendering useFieldArray fields',
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/no-index-field-array-key.md',
		},
		messages: {
			useFieldId:
				'Do not use the array index as the key for useFieldArray fields; use field.id. Index keys break field state when items are added, removed, or reordered.',
		},
		schema: [],
	},

	createOnce(context) {
		function isUseFieldArrayResult(identifier: Identifier): boolean {
			const declarator = resolveDeclarator(context, identifier);
			return declarator !== undefined && isFormHookCall(declarator.init, ['useFieldArray']);
		}

		// `fields` destructured (possibly aliased) from useFieldArray, or
		// `<result>.fields` where `<result>` holds the whole useFieldArray return.
		function isFieldArrayFields(node: Expression | Super): boolean {
			if (node.type === 'Identifier') {
				return isUseFieldArrayResult(node);
			}
			return (
				node.type === 'MemberExpression' &&
				node.property.type === 'Identifier' &&
				node.property.name === 'fields' &&
				node.object.type === 'Identifier' &&
				isUseFieldArrayResult(node.object)
			);
		}

		function isFieldArrayMapIndex(identifier: Identifier): boolean {
			const definition = resolveVariable(context, identifier, identifier.name)?.defs[0];
			if (definition?.type !== 'Parameter') {
				return false;
			}
			const callback = definition.node;
			if (
				(callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') ||
				callback.params[1] !== definition.name
			) {
				return false;
			}
			const call = parentOf(callback);
			return (
				call.type === 'CallExpression' &&
				call.arguments[0] === callback &&
				call.callee.type === 'MemberExpression' &&
				call.callee.property.type === 'Identifier' &&
				call.callee.property.name === 'map' &&
				isFieldArrayFields(call.callee.object)
			);
		}

		return {
			before() {
				// Matches require a literal useFieldArray call — skip whole files cheaply.
				if (!sourceMayContain(context, 'useFieldArray')) {
					return false;
				}
			},
			JSXAttribute(node: unknown) {
				const attribute = node as JsxAttribute;
				if (attribute.name.name !== 'key' || attribute.value?.type !== 'JSXExpressionContainer') {
					return;
				}
				const expression = attribute.value.expression;
				if (!expression) {
					return;
				}
				const identifiers: Identifier[] = [];
				collectIdentifiers(expression as Node, identifiers);
				for (const identifier of identifiers) {
					if (isFieldArrayMapIndex(identifier)) {
						context.report({
							node: identifier,
							messageId: 'useFieldId',
						});
					}
				}
			},
		};
	},
};

export default rule;
