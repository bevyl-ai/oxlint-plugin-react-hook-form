import type { Rule, Scope } from 'eslint';
import type { AssignmentProperty, CallExpression, Node, VariableDeclarator } from 'estree';

export function findPropertyByName(
	node: VariableDeclarator,
	targetName: string,
): AssignmentProperty | undefined {
	if (node.id.type !== 'ObjectPattern') {
		return undefined;
	}
	return node.id.properties.find(
		(p): p is AssignmentProperty =>
			p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === targetName,
	);
}

export function getDeclaredVariable(
	context: Rule.RuleContext,
	node: Node,
	name: string,
): Scope.Variable | undefined {
	return context.sourceCode.getScope(node).set.get(name);
}

export function isFormHookCall(
	init: VariableDeclarator['init'],
	hookNames: readonly string[],
): init is CallExpression {
	return (
		init?.type === 'CallExpression' &&
		init.callee.type === 'Identifier' &&
		hookNames.includes(init.callee.name)
	);
}

// Identifier references always sit under an expression, so parent is never null.
export function parentOf(node: Node): Node {
	return (node as Rule.Node).parent!;
}
