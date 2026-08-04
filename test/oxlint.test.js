import { expect, test } from 'bun:test';

const FIXTURES = new URL('./fixtures/', import.meta.url).pathname;

async function runOxlint(...files) {
	const proc = Bun.spawn(
		['bunx', 'oxlint', '-c', '.oxlintrc.json', '--format', 'json', ...files],
		{ cwd: FIXTURES, stdout: 'pipe', stderr: 'pipe' },
	);
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;
	expect(stderr).not.toContain('Error running JS plugin');
	return JSON.parse(stdout).diagnostics;
}

test('oxlint reports each rule on the violation fixture', async () => {
	const diagnostics = await runOxlint('violations.jsx');
	const codes = diagnostics.map((d) => d.code).sort();
	expect(codes).toEqual([
		'react-hook-form(destructuring-formstate)',
		'react-hook-form(no-access-control)',
		'react-hook-form(no-nested-object-setvalue)',
		'react-hook-form(no-use-watch)',
	]);
});

test('oxlint reports nothing on the clean fixture', async () => {
	const diagnostics = await runOxlint('clean.jsx');
	expect(diagnostics).toEqual([]);
});
