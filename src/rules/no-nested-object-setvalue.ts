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
		function fix(fixer: Rule.RuleFixer, setValueCall: CallExpression): Rule.Fix {
			const [pathArgument, valueArgument] = setValueCall.arguments;
			if (pathArgument?.type !== 'Literal' || !valueArgument) {
				throw new Error('setValue call shape changed between report and fix');
			}
			const calleeText = context.sourceCode.getText(setValueCall.callee);
			const fixTexts: string[] = [];
			const stack: Array<{ path: string; node: Node }> = [
				{ path: String(pathArgument.value), node: valueArgument },
			];
			while (stack.length) {
				const { path: currentPath, node: currentNode } = stack.shift()!;
				switch (currentNode.type) {
					case 'Literal':
						fixTexts.push(`${calleeText}('${currentPath}', ${currentNode.raw})`);
						break;
					case 'ObjectExpression':
						for (const prop of currentNode.properties) {
							if (prop.type === 'Property' && prop.key.type === 'Identifier') {
								stack.push({
									path: `${currentPath}.${prop.key.name}`,
									node: prop.value,
								});
							}
						}
						break;
					case 'ArrayExpression': {
						const [{ bracketAsArrayIndex = false } = {}] = context.options as [Options?];
						currentNode.elements.forEach((element, index) => {
							if (element && element.type !== 'SpreadElement') {
								stack.push({
									path: bracketAsArrayIndex
										? `${currentPath}[${index}]`
										: `${currentPath}.${index}`,
									node: element,
								});
							}
						});
						break;
					}
					default:
						break;
				}
			}
			return fixer.replaceText(setValueCall, fixTexts.join('\n'));
		}

		function checkCall(setValueCall: CallExpression): void {
			const secondArgument = setValueCall.arguments[1];
			if (!secondArgument) {
				return;
			}
			if (secondArgument.type === 'ArrayExpression') {
				context.report({
					node: secondArgument,
					messageId: 'useFieldArrayInstead',
				});
			} else if (secondArgument.type === 'ObjectExpression') {
				context.report({
					node: secondArgument,
					messageId: 'noNestedObj',
					fix: (fixer) => fix(fixer, setValueCall),
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
						(aliasName, aliasDeclarator) => checkSetValueReferences(aliasDeclarator, aliasName),
					);
				}
			},
		};
	},
};

export default rule;
