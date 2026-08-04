import { RuleTester } from 'eslint';

import plugin from '../src/index.ts';

// RuleTester drives bun:test's global describe/it itself, so the run() calls
// live at the top level rather than inside test() blocks.
const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
	},
});

const jsxRuleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: 'module',
		parserOptions: {
			ecmaFeatures: { jsx: true },
		},
	},
});

ruleTester.run('destructuring-formstate', plugin.rules['destructuring-formstate'], {
	valid: [
		'const { formState: { isDirty } } = useForm();',
		'const { register, formState: { errors } } = useFormContext();',
		'const { isDirty } = useFormState();',
		'const { formState } = useSomethingElse(); formState.isDirty;',
		// passing formState around whole is not property access
		'const form = useForm(); report(form.formState);',
		'const form = useForm(); form.handleSubmit(onSubmit);',
	],
	invalid: [
		{
			code: 'const { formState } = useForm(); const dirty = formState.isDirty;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const { formState: state } = useFormContext(); state.errors;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const formState = useFormState(); formState.isDirty;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const form = useForm(); const dirty = form.formState.isDirty;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'function C() { const form = useFormContext(); return form.formState.errors; }',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const form = useForm(); const { formState } = form; formState.isValid;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const form = useForm(); form["formState"].isDirty;',
			errors: [{ messageId: 'useDestructure' }],
		},
		{
			code: 'const form = useForm(); const f2 = form; f2.formState.isDirty;',
			errors: [{ messageId: 'useDestructure' }],
		},
	],
});

ruleTester.run('no-access-control', plugin.rules['no-access-control'], {
	valid: [
		'const { control } = useForm(); useController({ control });',
		'const { control } = useForm(); useFieldArray({ control, name: "test" });',
		'const form = useForm(); useFieldArray({ control: form.control, name: "test" });',
	],
	invalid: [
		{
			code: 'const { control } = useForm(); control._formValues;',
			errors: [{ messageId: 'noAccessControl' }],
		},
		{
			code: 'const { control: c } = useFormContext(); c._fields;',
			errors: [{ messageId: 'noAccessControl' }],
		},
		{
			code: 'const form = useForm(); form.control._formValues;',
			errors: [{ messageId: 'noAccessControl' }],
		},
		{
			code: 'const form = useForm(); const { control } = form; control._fields;',
			errors: [{ messageId: 'noAccessControl' }],
		},
	],
});

ruleTester.run('no-nested-object-setvalue', plugin.rules['no-nested-object-setvalue'], {
	valid: [
		"const { setValue } = useForm(); setValue('a.b', 'value');",
		"const { setValue } = useForm(); setValue('a', value);",
		"const form = useForm(); form.setValue('a.b', 'value');",
	],
	invalid: [
		{
			code: "const { setValue } = useForm(); setValue('a', { b: 'test' });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.b', 'test');",
		},
		{
			code: "const form = useForm(); form.setValue('a', { b: 'test' });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const form = useForm(); form.setValue('a.b', 'test');",
		},
		{
			code: "const form = useForm(); const { setValue } = form; setValue('a', { b: 'test' });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const form = useForm(); const { setValue } = form; setValue('a.b', 'test');",
		},
		{
			code: "const { setValue } = useForm(); setValue('a', { b: ['x', 'y'] });",
			options: [{ bracketAsArrayIndex: true }],
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.b[0]', 'x')\nsetValue('a.b[1]', 'y');",
		},
		// whole-array setValue: useFieldArray diagnostic, no autofix
		{
			code: "const { setValue } = useForm(); setValue('files', ['x']);",
			errors: [{ messageId: 'useFieldArrayInstead' }],
		},
		{
			code: "const form = useForm(); form.setValue('files', [file]);",
			errors: [{ messageId: 'useFieldArrayInstead' }],
		},
		// non-literal leaf values are inlined verbatim, not dropped
		{
			code: "const { setValue } = useForm(); setValue('a', { b: value, c: f(x) });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.b', value)\nsetValue('a.c', f(x));",
		},
		// string-literal keys decompose when path-safe
		{
			code: "const { setValue } = useForm(); setValue('a', { 'b-c': 1 });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.b-c', 1);",
		},
		// no fix offered (and no crash) for non-literal paths
		{
			code: "const { setValue } = useForm(); setValue(name, { b: 'x' });",
			errors: [{ messageId: 'noNestedObj' }],
		},
		{
			code: 'const { setValue } = useForm(); setValue(`a.${i}`, { b: "x" });',
			errors: [{ messageId: 'noNestedObj' }],
		},
		// no fix offered when decomposing would drop or misplace data
		{
			code: "const { setValue } = useForm(); setValue('a', { ...spread, b: 'x' });",
			errors: [{ messageId: 'noNestedObj' }],
		},
		{
			code: "const { setValue } = useForm(); setValue('a', { [key]: 'x' });",
			errors: [{ messageId: 'noNestedObj' }],
		},
		{
			code: "const { setValue } = useForm(); setValue('a', { 'dotted.key': 'x' });",
			errors: [{ messageId: 'noNestedObj' }],
		},
		{
			code: "const { setValue } = useForm(); setValue(\"it's\", { b: 'x' });",
			errors: [{ messageId: 'noNestedObj' }],
		},
	],
});

ruleTester.run('no-use-watch', plugin.rules['no-use-watch'], {
	valid: [
		'const { register } = useForm(); const value = useWatch({ name: "test" });',
		'const methods = useForm(); methods.register("test");',
		// an unrelated same-named binding in another component must not be flagged
		'function A() { const methods = useForm(); } function B() { const methods = other(); const { watch } = methods; }',
		'const methods = useForm(); function inner() { const methods = other(); methods.watch("x"); }',
	],
	invalid: [
		{
			code: 'const { watch } = useForm(); watch("test");',
			errors: [{ messageId: 'useUseWatch' }],
		},
		{
			code: 'const methods = useForm(); methods.watch("test");',
			errors: [{ messageId: 'useUseWatch' }],
		},
		{
			code: 'const methods = useFormContext(); const { watch } = methods;',
			errors: [{ messageId: 'useUseWatch' }],
		},
		{
			code: 'const methods = useForm(); const m2 = methods; m2.watch("x");',
			errors: [{ messageId: 'useUseWatch' }],
		},
	],
});

jsxRuleTester.run('no-index-field-array-key', plugin.rules['no-index-field-array-key'], {
	valid: [
		`const { fields } = useFieldArray({ control, name: "items" });
		fields.map((field, index) => <input key={field.id} name={\`items.\${index}\`} />);`,
		// not a useFieldArray list
		'const items = getItems(); items.map((item, index) => <li key={index} />);',
		`const result = useFieldArray({ control, name: "items" });
		result.fields.map((field) => <input key={field.id} />);`,
	],
	invalid: [
		{
			code: `const { fields } = useFieldArray({ control, name: "items" });
			fields.map((field, index) => <input key={index} />);`,
			errors: [{ messageId: 'useFieldId' }],
		},
		{
			code: `const { fields: rows } = useFieldArray({ control, name: "items" });
			rows.map((row, i) => <li key={i} />);`,
			errors: [{ messageId: 'useFieldId' }],
		},
		{
			code: `const result = useFieldArray({ control, name: "items" });
			result.fields.map((field, index) => <li key={\`row-\${index}\`} />);`,
			errors: [{ messageId: 'useFieldId' }],
		},
		{
			code: `const { fields } = useFieldArray({ control, name: "items" });
			const rows = fields;
			rows.map((row, i) => <li key={i} />);`,
			errors: [{ messageId: 'useFieldId' }],
		},
	],
});
