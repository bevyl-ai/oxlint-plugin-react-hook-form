export function getDeclaredVariable(context, node, name) {
	return context.sourceCode.getScope(node).set.get(name);
}
