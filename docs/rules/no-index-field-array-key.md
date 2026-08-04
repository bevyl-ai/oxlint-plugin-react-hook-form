# Use field.id, not the array index, as the key when rendering useFieldArray fields (no-index-field-array-key)

From the [react-hook-form useFieldArray rules](https://react-hook-form.com/docs/usefieldarray#rules): `useFieldArray` generates a unique `id` for each field entry, and `field.id` (not the index) must be used as the component key. Index keys break field state when items are added, removed, or reordered.

## Rule Details

Examples of **incorrect** code for this rule:

```jsx
const { fields } = useFieldArray({ control, name: "items" });

// ❌ index as key
{fields.map((field, index) => <input key={index} {...register(`items.${index}.value`)} />)}

// ❌ index inside a derived key
{fields.map((field, index) => <li key={`row-${index}`} />)}
```

Examples of **correct** code for this rule:

```jsx
const { fields } = useFieldArray({ control, name: "items" });

// ✅ field.id as key
{fields.map((field, index) => <input key={field.id} {...register(`items.${index}.value`)} />)}
```

Using the index for the field *name* path is fine (and required); only the React `key` must come from `field.id`.

## When Not To Use It

If you are not rendering `useFieldArray` fields with `.map`, this rule never fires.
