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

ruleTester.run('destructuring-formstate', plugin.rules['destructuring-formstate'], {
	valid: [
		'const { formState: { isDirty } } = useForm();',
		'const { register, formState: { errors } } = useFormContext();',
		'const { isDirty } = useFormState();',
		'const { formState } = useSomethingElse(); formState.isDirty;',
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
	],
});

ruleTester.run('no-access-control', plugin.rules['no-access-control'], {
	valid: [
		'const { control } = useForm(); useController({ control });',
		'const { control } = useForm(); useFieldArray({ control, name: "test" });',
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
	],
});

ruleTester.run('no-nested-object-setvalue', plugin.rules['no-nested-object-setvalue'], {
	valid: [
		"const { setValue } = useForm(); setValue('a.b', 'value');",
		"const { setValue } = useForm(); setValue('a', value);",
	],
	invalid: [
		{
			code: "const { setValue } = useForm(); setValue('a', { b: 'test' });",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.b', 'test');",
		},
		{
			code: "const { setValue } = useForm(); setValue('a', ['x', 'y']);",
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a.0', 'x')\nsetValue('a.1', 'y');",
		},
		{
			code: "const { setValue } = useForm(); setValue('a', ['x']);",
			options: [{ bracketAsArrayIndex: true }],
			errors: [{ messageId: 'noNestedObj' }],
			output: "const { setValue } = useForm(); setValue('a[0]', 'x');",
		},
	],
});

ruleTester.run('no-use-watch', plugin.rules['no-use-watch'], {
	valid: [
		'const { register } = useForm(); const value = useWatch({ name: "test" });',
		'const methods = useForm(); methods.register("test");',
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
	],
});
