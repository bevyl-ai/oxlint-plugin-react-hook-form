/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao), migrated to
 * the modern `context.sourceCode` API and extended per the react-hook-form
 * setValue rules:
 * - tracks the form object (`form.setValue(...)`) in addition to destructured
 *   bindings
 * - a whole-array second argument gets its own diagnostic pointing at
 *   useFieldArray (whole-array setValue is slated for removal upstream) and
 *   no autofix, since splitting into index paths is not the right migration.
 */
import type { Rule } from 'eslint';
import type { CallExpression, Node } from 'estree';

import {
	findPropertyByName,
	forEachNamespaceAccess,
	getDeclaredVariable,
	isFormHookCall,
	parentOf,
} from '../utils/ast.js';

interface Options {
	bracketAsArrayIndex?: boolean;
}

const rule: Rule.RuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Avoid nested object in second argument of setValue',
			url: 'https://github.com/bevyl-ai/oxlint-plugin-react-hook-form/blob/main/docs/rules/no-nested-object-setvalue.md',
		},
		fixable: 'code',
		messages: {
			noNestedObj:
				'Avoid passing object or array as second argument in setValue since this is less performant',
			useFieldArrayInstead:
				'Avoid setting an entire array with setValue; use the useFieldArray methods (replace, append, update) instead. Whole-array setValue is slated for removal in the next major version of react-hook-form.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					bracketAsArrayIndex: {
						type: 'boolean',
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		function propertyKeyName(prop: Node): string | undefined {
			if (prop.type !== 'Property' || prop.computed) {
				return undefined;
			}
			if (prop.key.type === 'Identifier') {
				return prop.key.name;
			}
			// String keys are decomposable as long as they stay valid inside a
			// single-quoted dot path.
			if (
				prop.key.type === 'Literal' &&
				typeof prop.key.value === 'string' &&
				/^[\w-]+$/.test(prop.key.value)
			) {
				return prop.key.value;
			}
			return undefined;
		}

		// The fix rewrites the call into one setValue per leaf path. That is only
		// sound when every container can be statically decomposed: no spreads, no
		// computed or exotic keys, no holes. Leaf values of any expression type are
		// fine — they are inlined verbatim.
		function isDecomposable(node: Node): boolean {
			if (node.type === 'ObjectExpression') {
				return node.properties.every(
					(prop) => propertyKeyName(prop) !== undefined && isDecomposable((prop as { value: Node } & typeof prop).value),
				);
			}
			if (node.type === 'ArrayExpression') {
				return node.elements.every(
					(element) => element != null && element.type !== 'SpreadElement' && isDecomposable(element),
				);
			}
			return true;
		}

		function fix(fixer: Rule.RuleFixer, setValueCall: CallExpression, basePath: string): Rule.Fix {
			const calleeText = context.sourceCode.getText(setValueCall.callee);
			const valueArgument = setValueCall.arguments[1]!;
			const fixTexts: string[] = [];
			const stack: Array<{ path: string; node: Node }> = [
				{ path: basePath, node: valueArgument },
			];
			while (stack.length) {
				const { path: currentPath, node: currentNode } = stack.shift()!;
				if (currentNode.type === 'ObjectExpression') {
					for (const prop of currentNode.properties) {
						stack.push({
							path: `${currentPath}.${propertyKeyName(prop)!}`,
							node: (prop as { value: Node } & typeof prop).value,
						});
					}
				} else if (currentNode.type === 'ArrayExpression') {
					const [{ bracketAsArrayIndex = false } = {}] = context.options as [Options?];
					currentNode.elements.forEach((element, index) => {
						stack.push({
							path: bracketAsArrayIndex ? `${currentPath}[${index}]` : `${currentPath}.${index}`,
							node: element!,
						});
					});
				} else {
					fixTexts.push(`${calleeText}('${currentPath}', ${context.sourceCode.getText(currentNode)})`);
				}
			}
			return fixer.replaceText(setValueCall, fixTexts.join('\n'));
		}

		function checkCall(setValueCall: CallExpression): void {
			const [pathArgument, secondArgument] = setValueCall.arguments;
			if (!secondArgument) {
				return;
			}
			if (secondArgument.type === 'ArrayExpression') {
				context.report({
					node: secondArgument,
					messageId: 'useFieldArrayInstead',
				});
			} else if (secondArgument.type === 'ObjectExpression') {
				// Only offer the autofix when the rewrite is provably safe: a static
				// string path that survives single-quoting, and a fully decomposable
				// value. Otherwise report without a fix.
				const canFix =
					pathArgument?.type === 'Literal' &&
					typeof pathArgument.value === 'string' &&
					!pathArgument.value.includes("'") &&
					!pathArgument.value.includes('\\') &&
					isDecomposable(secondArgument);
				const basePath = canFix ? String((pathArgument as { value: string }).value) : '';
				context.report({
					node: secondArgument,
					messageId: 'noNestedObj',
					...(canFix ? { fix: (fixer: Rule.RuleFixer) => fix(fixer, setValueCall, basePath) } : {}),
				});
			}
		}

		function checkSetValueReferences(node: Node, setValueName: string): void {
			const setValueVar = getDeclaredVariable(context, node, setValueName);
			if (!setValueVar) {
				return;
			}
			for (const reference of setValueVar.references) {
				const parent = parentOf(reference.identifier);
				if (parent.type === 'CallExpression' && parent.callee === reference.identifier) {
					checkCall(parent);
				}
			}
		}

		return {
			VariableDeclarator(node) {
				if (!isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					return;
				}
				if (node.id.type === 'ObjectPattern') {
					const setValueProperty = findPropertyByName(node, 'setValue');
					// Only looking for {setValue} or {setValue: alias}
					if (setValueProperty?.value.type !== 'Identifier') {
						return;
					}
					checkSetValueReferences(node, setValueProperty.value.name);
				} else if (node.id.type === 'Identifier') {
					forEachNamespaceAccess(
						context,
						node as typeof node & { id: typeof node.id },
						'setValue',
						(member) => {
							const call = parentOf(member);
							if (call.type === 'CallExpression' && call.callee === member) {
								checkCall(call);
							}
						},
						(property, aliasDeclarator) =>
							checkSetValueReferences(aliasDeclarator, property.value.name),
					);
				}
			},
		};
	},
};

export default rule;
