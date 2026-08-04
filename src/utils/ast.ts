import type { Rule, Scope } from 'eslint';
import type {
	AssignmentProperty,
	CallExpression,
	Identifier,
	MemberExpression,
	Node,
	VariableDeclarator,
} from 'estree';

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

/** `obj.name` or `obj["name"]`. */
export function isPropertyAccess(member: MemberExpression, name: string): boolean {
	return member.computed
		? member.property.type === 'Literal' && member.property.value === name
		: member.property.type === 'Identifier' && member.property.name === name;
}

/**
 * Visit every use of `<formVar>.<propertyName>` for a form object bound as an
 * Identifier (`const form = useForm()`), including re-destructuring
 * (`const { setValue } = form` / `const { setValue: alias } = form`) and
 * whole-object aliases (`const f2 = form; f2.setValue(...)`).
 */
export function forEachNamespaceAccess(
	context: Rule.RuleContext,
	declarator: VariableDeclarator & { id: Identifier },
	propertyName: string,
	onMemberAccess: (member: MemberExpression) => void,
	onAliasBinding: (property: AssignmentProperty & { value: Identifier }, aliasDeclarator: VariableDeclarator) => void,
	visited: Set<Scope.Variable> = new Set(),
): void {
	const formVar = getDeclaredVariable(context, declarator, declarator.id.name);
	if (!formVar || visited.has(formVar)) {
		return;
	}
	visited.add(formVar);
	for (const reference of formVar.references) {
		const parent = parentOf(reference.identifier);
		if (
			parent.type === 'MemberExpression' &&
			parent.object === reference.identifier &&
			isPropertyAccess(parent, propertyName)
		) {
			onMemberAccess(parent);
		} else if (parent.type === 'VariableDeclarator' && parent.init === reference.identifier) {
			if (parent.id.type === 'ObjectPattern') {
				const property = findPropertyByName(parent, propertyName);
				if (property?.value.type === 'Identifier') {
					onAliasBinding(property as typeof property & { value: Identifier }, parent);
				}
			} else if (parent.id.type === 'Identifier') {
				forEachNamespaceAccess(
					context,
					parent as VariableDeclarator & { id: Identifier },
					propertyName,
					onMemberAccess,
					onAliasBinding,
					visited,
				);
			}
		}
	}
}

/**
 * Resolve an identifier to the VariableDeclarator that ultimately initializes
 * it, following whole-object alias chains (`const b = a`).
 */
export function resolveDeclarator(
	context: Rule.RuleContext,
	identifier: Identifier,
): VariableDeclarator | undefined {
	const seen = new Set<Scope.Variable>();
	let current = identifier;
	for (;;) {
		const variable = resolveVariable(context, current, current.name);
		if (!variable || seen.has(variable)) {
			return undefined;
		}
		seen.add(variable);
		const definition = variable.defs[0];
		if (definition?.node.type !== 'VariableDeclarator') {
			return undefined;
		}
		if (definition.node.init?.type === 'Identifier') {
			current = definition.node.init;
			continue;
		}
		return definition.node;
	}
}

export function resolveVariable(
	context: Rule.RuleContext,
	node: Node,
	name: string,
): Scope.Variable | undefined {
	let scope: Scope.Scope | null = context.sourceCode.getScope(node);
	while (scope) {
		const variable = scope.set.get(name);
		if (variable) {
			return variable;
		}
		scope = scope.upper;
	}
	return undefined;
}

/**
 * Collect the Identifier nodes that are value references inside an expression
 * (skips non-computed member property names and non-computed object keys).
 */
export function collectIdentifiers(node: Node, out: Identifier[]): void {
	if (node.type === 'Identifier') {
		out.push(node);
		return;
	}
	if (node.type === 'MemberExpression') {
		collectIdentifiers(node.object, out);
		if (node.computed) {
			collectIdentifiers(node.property, out);
		}
		return;
	}
	if (node.type === 'Property') {
		if (node.computed) {
			collectIdentifiers(node.key, out);
		}
		collectIdentifiers(node.value, out);
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}
		for (const child of Array.isArray(value) ? value : [value]) {
			if (child && typeof child === 'object' && typeof (child as Node).type === 'string') {
				collectIdentifiers(child as Node, out);
			}
		}
	}
}
