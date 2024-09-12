import { CacheHandler } from '../../types';
import { JwksError, SigningKeyNotFoundError } from './errors';
import { retrieveSigningKeys } from './utils';

const logger = console.log;

export class JwksClient {
	options: any;
	constructor(options: { jwksUri: string; cacheHandler: CacheHandler }) {
		this.options = {
			...options,
		};
	}

	async getKeys() {
		try {
			const cachedKeys = await this.options.cacheHandler.get(this.options.jwksUri);
			let keys;
			if (cachedKeys) {
				logger('Keys retrieved from cache: ');
				keys = JSON.parse(cachedKeys);
			} else {
				logger(`Fetching keys from '${this.options.jwksUri}': `);
				const res = (await fetch(this.options.jwksUri, {}).then((res) => res.json())) as { keys: [] };
				this.options.cacheHandler.set(this.options.jwksUri, JSON.stringify(res.keys));
				keys = res.keys;
			}
			logger(keys);
			return keys;
		} catch (err: any) {
			const { errorMsg } = err;
			logger('Failure:', errorMsg || err);
			throw errorMsg ? new JwksError(errorMsg) : err;
		}
	}

	async getSigningKeys() {
		const keys = await this.getKeys();
		if (!keys || !keys.length) {
			throw new JwksError('The JWKS endpoint did not contain any keys');
		}

		const signingKeys = await retrieveSigningKeys(keys);

		if (!signingKeys.length) {
			throw new JwksError('The JWKS endpoint did not contain any signing keys');
		}

		logger('Signing Keys:', signingKeys);
		return signingKeys;
	}

	async getSigningKey(kid: string) {
		logger(`Fetching signing key for '${kid}'`);
		const keys = await this.getSigningKeys();

		const kidDefined = kid !== undefined && kid !== null;
		if (!kidDefined && keys.length > 1) {
			logger('No KID specified and JWKS endpoint returned more than 1 key');
			throw new SigningKeyNotFoundError('No KID specified and JWKS endpoint returned more than 1 key');
		}

		const key = keys.find((k: { kid?: string }) => !kidDefined || k.kid === kid);
		if (key) {
			return key;
		} else {
			logger(`Unable to find a signing key that matches '${kid}'`);
			throw new SigningKeyNotFoundError(`Unable to find a signing key that matches '${kid}'`);
		}
	}
}
