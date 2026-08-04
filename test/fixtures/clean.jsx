import { useFieldArray, useForm, useWatch } from 'react-hook-form';

export function CleanForm() {
	const {
		register,
		setValue,
		control,
		formState: { isDirty },
	} = useForm();
	const name = useWatch({ control, name: 'user.name' });
	setValue('user.name', name);
	return <input {...register('user.name')} data-dirty={isDirty} />;
}

export function CleanFieldArray({ control }) {
	const { fields, append } = useFieldArray({ control, name: 'items' });
	return (
		<ul>
			{fields.map((field, index) => (
				<li key={field.id}>{`item ${index}`}</li>
			))}
			<button onClick={() => append({ value: '' })} />
		</ul>
	);
}
