import { expect, test } from 'bun:test';

const FIXTURES = new URL('./fixtures/', import.meta.url).pathname;

async function runOxlint(...files) {
	const proc = Bun.spawn(
		['bunx', 'oxlint', '-c', '.oxlintrc.json', '--format', 'json', ...files],
		{ cwd: FIXTURES, stdout: 'pipe', stderr: 'pipe' },
	);
	const [stdout] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;
	const diagnostics = JSON.parse(stdout).diagnostics as Array<{ code: string; message: string }>;
	// oxlint surfaces JS-plugin runtime errors as diagnostics on stdout
	for (const diagnostic of diagnostics) {
		expect(diagnostic.message).not.toContain('Error running JS plugin');
	}
	return diagnostics;
}

test('oxlint reports each rule on the violation fixture', async () => {
	const diagnostics = await runOxlint('violations.jsx');
	const codes = diagnostics.map((d) => d.code).sort();
	expect(codes).toEqual([
		'react-hook-form(destructuring-formstate)',
		// namespace access: form.formState.isDirty + form.formState.isValid
		'react-hook-form(destructuring-formstate)',
		'react-hook-form(destructuring-formstate)',
		'react-hook-form(no-access-control)',
		'react-hook-form(no-index-field-array-key)',
		'react-hook-form(no-nested-object-setvalue)',
		// whole-array setValue reports under the same rule name
		'react-hook-form(no-nested-object-setvalue)',
		'react-hook-form(no-use-watch)',
	]);
});

test('oxlint reports nothing on the clean fixture', async () => {
	const diagnostics = await runOxlint('clean.jsx');
	expect(diagnostics).toEqual([]);
});
