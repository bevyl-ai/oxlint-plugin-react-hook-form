import type { Rule } from 'eslint';

export type CreateOnceRule = Omit<Rule.RuleModule, 'create'> & {
	createOnce: (context: Rule.RuleContext) => Rule.RuleListener & {
		before?: () => boolean | void;
		after?: () => void;
	};
};
