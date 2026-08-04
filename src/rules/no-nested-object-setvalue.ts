/**
 * Ported from eslint-plugin-react-hook-form (MIT, Chuan-Tse Kao),
 * migrated to the modern `context.sourceCode` API.
 */
import type { Rule } from 'eslint';
import type { CallExpression, Node } from 'estree';

import { findPropertyByName, getDeclaredVariable, isFormHookCall, parentOf } from '../utils/ast.js';

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
			if (
				pathArgument?.type !== 'Literal' ||
				!valueArgument ||
				setValueCall.callee.type !== 'Identifier'
			) {
				throw new Error('setValue call shape changed between report and fix');
			}
			const calleeName = setValueCall.callee.name;
			const fixTexts: string[] = [];
			const stack: Array<{ path: string; node: Node }> = [
				{ path: String(pathArgument.value), node: valueArgument },
			];
			while (stack.length) {
				const { path: currentPath, node: currentNode } = stack.shift()!;
				switch (currentNode.type) {
					case 'Literal':
						fixTexts.push(`${calleeName}('${currentPath}', ${currentNode.raw})`);
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

		return {
			VariableDeclarator(node) {
				if (!isFormHookCall(node.init, ['useForm', 'useFormContext'])) {
					return;
				}
				const setValueProperty = findPropertyByName(node, 'setValue');
				// Only looking for {setValue} or {setValue: alias}
				if (setValueProperty?.value.type !== 'Identifier') {
					return;
				}
				const setValueVar = getDeclaredVariable(context, node, setValueProperty.value.name);
				if (!setValueVar) {
					return;
				}
				for (const reference of setValueVar.references) {
					const setValueCall = parentOf(reference.identifier);
					if (setValueCall.type !== 'CallExpression') {
						continue;
					}
					const secondArgument = setValueCall.arguments[1];
					if (
						secondArgument &&
						(secondArgument.type === 'ArrayExpression' || secondArgument.type === 'ObjectExpression')
					) {
						context.report({
							node: secondArgument,
							messageId: 'noNestedObj',
							fix: (fixer) => fix(fixer, setValueCall),
						});
					}
				}
			},
		};
	},
};

export default rule;
