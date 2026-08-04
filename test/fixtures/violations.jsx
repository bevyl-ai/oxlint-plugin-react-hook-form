import { useFieldArray, useForm, useFormContext } from 'react-hook-form';

export function FormStateAccess() {
	const { formState } = useForm();
	return <p>{formState.isDirty ? 'dirty' : 'clean'}</p>;
}

export function NamespaceFormStateAccess() {
	const form = useForm();
	return <button disabled={!form.formState.isDirty || !form.formState.isValid} />;
}

export function ControlAccess() {
	const { control } = useFormContext();
	return <p>{Object.keys(control._fields).length}</p>;
}

export function NestedSetValue() {
	const { setValue } = useForm();
	setValue('user', { name: 'ada' });
	return null;
}

export function WholeArraySetValue() {
	const form = useForm();
	form.setValue('files', [new File([], 'a.txt')]);
	return null;
}

export function WatchInsteadOfUseWatch() {
	const { watch } = useForm();
	return <p>{watch('user.name')}</p>;
}

export function IndexKeyedFieldArray({ control }) {
	const { fields } = useFieldArray({ control, name: 'items' });
	return (
		<ul>
			{fields.map((field, index) => (
				<li key={index}>{field.value}</li>
			))}
		</ul>
	);
}
