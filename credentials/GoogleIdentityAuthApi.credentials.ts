import type {
	CredentialInformation,
	IAuthenticate,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

type CredentialProperties = {
	[K in GoogleIdentityAuthApi['properties'][number]['name']]: CredentialInformation;
};
type SigninMethods = 'refresh_token' | 'email_password';
type ArrayFlatten<T> = T extends (infer U)[] ? U : T;

const signinMethods = {
	RefreshToken: 'refresh_token',
	EmailPassword: 'email_password',
} as const satisfies Record<string, SigninMethods>;

export class GoogleIdentityAuthApi implements ICredentialType {
	name = 'googleIdentityAuthApi';

	displayName = 'Google Identity Auth API';

	// See also: https://firebase.google.com/docs/reference/rest/auth
	documentationUrl = 'https://docs.cloud.google.com/identity-platform/docs/use-rest-api';

	properties = [
		{
			displayName: 'Signin Method',
			name: 'signinMethod',
			type: 'options',
			options: [
				{
					name: 'Refresh Token',
					value: signinMethods.RefreshToken,
				},
				{
					name: 'Email/Password',
					value: signinMethods.EmailPassword,
				},
			] satisfies (ArrayFlatten<INodeProperties['options']> & { value: SigninMethods })[],
			default: signinMethods.RefreshToken,
			required: true,
			description: 'The method to use for signing in to Google Identity Auth',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Google Identity Auth refresh token used to obtain new access tokens',
			displayOptions: {
				show: {
					signinMethod: [signinMethods.RefreshToken],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			required: true,
			description: 'The email address of the Google Identity Auth user',
			displayOptions: {
				show: {
					signinMethod: [signinMethods.EmailPassword],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The password of the Google Identity Auth user',
			displayOptions: {
				show: {
					signinMethod: [signinMethods.EmailPassword],
				},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'The API key for your Google Identity Auth project, found in the project settings in the Google Cloud console',
		},
		{
			displayName: 'Customize Headers',
			name: 'header',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Header Name',
			name: 'headerName',
			type: 'string',
			displayOptions: {
				show: {
					header: [true],
				},
			},
			default: '',
			required: true,
			description: 'The name of the custom header to include in requests',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	] as const satisfies INodeProperties[];

	authenticate: IAuthenticate = {
		type: 'generic',
		properties: {
			headers: {
				['={{$credentials.headerName ?? "Authorization"}}']: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		const credentialProperties = credentials as CredentialProperties;

		const signinMethod = credentialProperties.signinMethod as SigninMethods;
		const apiKey = credentialProperties.apiKey as string;

		switch (signinMethod) {
			case signinMethods.RefreshToken: {
				const refreshToken = credentialProperties.refreshToken as string;

				const res: { id_token: string } = await this.helpers.httpRequest({
					url: `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
					method: 'POST',
					body: JSON.stringify({
						grant_type: 'refresh_token',
						refreshToken,
					}),
					headers: {
						'Content-Type': 'application/json',
					},
				});

				return { accessToken: res.id_token };
			}

			case signinMethods.EmailPassword: {
				const email = credentialProperties.email as string;
				const password = credentialProperties.password as string;

				const res: { idToken: string } = await this.helpers.httpRequest({
					url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
					method: 'POST',
					body: JSON.stringify({
						email,
						password,
						returnSecureToken: true,
					}),
					headers: {
						'Content-Type': 'application/json',
					},
				});
				return { accessToken: res.idToken };
			}

			default: {
				signinMethod satisfies never;
				throw new Error(`The signin method "${signinMethod}" is not supported.`);
			}
		}
	}
}
