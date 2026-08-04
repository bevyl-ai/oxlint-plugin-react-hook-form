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
		function fix(fixer, setValueCallExpression) {
			const fixTexts = [];
			const stack = [
				{
					path: setValueCallExpression.arguments[0].value,
					node: setValueCallExpression.arguments[1],
				},
			];
			while (stack.length) {
				const { path: currentPath, node: currentNode } = stack.shift();
				switch (currentNode.type) {
					case 'Literal':
						fixTexts.push(
							`${setValueCallExpression.callee.name}('${currentPath}', ${currentNode.raw})`,
						);
						break;
					case 'ObjectExpression':
						for (const prop of currentNode.properties) {
							stack.push({
								path: `${currentPath}.${prop.key.name}`,
								node: prop.value,
							});
						}
						break;
					case 'ArrayExpression': {
						const [{ bracketAsArrayIndex = false } = {}] = context.options;
						const getIndexSyntax = (index) => (bracketAsArrayIndex ? `[${index}]` : `.${index}`);
						currentNode.elements.forEach((element, index) => {
							stack.push({
								path: `${currentPath}${getIndexSyntax(index)}`,
								node: element,
							});
						});
						break;
					}
					default:
						break;
				}
			}
			return fixer.replaceText(setValueCallExpression, fixTexts.join('\n'));
		}

		return {
			VariableDeclarator(node) {
				if (
					node.init?.type !== 'CallExpression' ||
					(node.init.callee.name !== 'useForm' && node.init.callee.name !== 'useFormContext')
				) {
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
					const setValueCallExpression = reference.identifier.parent;
					if (setValueCallExpression.type !== 'CallExpression') {
						continue;
					}
					const secondArgument = setValueCallExpression.arguments[1];
					if (
						secondArgument &&
						(secondArgument.type === 'ArrayExpression' || secondArgument.type === 'ObjectExpression')
					) {
						context.report({
							node: secondArgument,
							messageId: 'noNestedObj',
							fix: (fixer) => fix(fixer, setValueCallExpression),
						});
					}
				}
			},
		};
	},
};
