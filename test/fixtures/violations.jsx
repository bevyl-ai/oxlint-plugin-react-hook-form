import { useForm, useFormContext } from 'react-hook-form';

export function FormStateAccess() {
	const { formState } = useForm();
	return <p>{formState.isDirty ? 'dirty' : 'clean'}</p>;
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

export function WatchInsteadOfUseWatch() {
	const { watch } = useForm();
	return <p>{watch('user.name')}</p>;
}
