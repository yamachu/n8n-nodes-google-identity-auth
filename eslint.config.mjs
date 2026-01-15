import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		rules: {
			// This package provides only credentials, so disabling the rule about empty package.json nodes array
			'n8n-nodes-base/community-package-json-n8n-nodes-empty': 'off',
			// Disabling icon validation rule as this package has no icon
			'@n8n/community-nodes/icon-validation': 'off',
			// Disabling credential test requirement as this package's credential cannot be tested automatically
			'@n8n/community-nodes/credential-test-required': 'off',
		},
	},
];
