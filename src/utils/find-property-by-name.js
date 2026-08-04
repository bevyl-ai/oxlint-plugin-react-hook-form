export function findPropertyByName(node, targetName) {
	return node.id.type === 'ObjectPattern'
		? node.id.properties.find((p) => p.type === 'Property' && p.key.name === targetName)
		: null;
}
