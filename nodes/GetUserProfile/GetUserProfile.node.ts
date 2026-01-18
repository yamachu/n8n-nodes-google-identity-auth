import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class GetUserProfile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Get User Profile',
		name: 'getUserProfile',
		icon: 'fa:user',
		group: ['transform'],
		version: 1,
		description: 'Get user profile information from Google Identity Auth',
		defaults: {
			name: 'Get User Profile',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: undefined,
		credentials: [
			{
				name: 'googleIdentityAuthApi',
				required: true,
			},
		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('googleIdentityAuthApi');

		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'No credentials provided');
		}

		const apiKey = credentials.apiKey as string;
		if (!apiKey) {
			throw new NodeOperationError(this.getNode(), 'API Key is required in credentials');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				// Get the access token from preAuthentication
				const accessToken = credentials.accessToken as string;

				if (!accessToken) {
					throw new NodeOperationError(this.getNode(), 'No access token available');
				}

				const response = await this.helpers.httpRequest({
					url: `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
					method: 'POST',
					body: {
						idToken: accessToken,
					},
					headers: {
						'Content-Type': 'application/json',
					},
				});

				if (response.users && response.users.length > 0) {
					returnData.push({
						json: GetUserProfile.formatUserProfile(response.users[0]),
					});
				} else {
					throw new NodeOperationError(this.getNode(), 'No user found');
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error occurred',
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static formatUserProfile(user: any) {
		return {
			uid: user.localId,
			email: user.email,
			emailVerified: user.emailVerified || false,
			displayName: user.displayName || null,
			photoUrl: user.photoUrl || null,
		};
	}
}
