import { useForm, useWatch } from 'react-hook-form';

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
