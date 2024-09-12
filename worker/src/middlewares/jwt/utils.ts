import * as jose from 'jose';
import { JwksError } from './errors';

function resolveAlg(jwk: { alg?: string; kty: string; crv?: string }) {
	if (jwk.alg) {
		return jwk.alg;
	}

	if (jwk.kty === 'RSA') {
		return 'RS256';
	}

	if (jwk.kty === 'EC') {
		switch (jwk.crv) {
			case 'P-256':
				return 'ES256';
			case 'secp256k1':
				return 'ES256K';
			case 'P-384':
				return 'ES384';
			case 'P-521':
				return 'ES512';
		}
	}

	if (jwk.kty === 'OKP') {
		switch (jwk.crv) {
			case 'Ed25519':
			case 'Ed448':
				return 'EdDSA';
		}
	}

	throw new JwksError('Unsupported JWK');
}

export async function retrieveSigningKeys(jwks: any[]) {
	const results = [];

	jwks = jwks.filter(({ use }) => use === 'sig' || use === undefined).filter(({ kty }) => kty === 'RSA' || kty === 'EC' || kty === 'OKP');

	for (const jwk of jwks) {
		try {
			const key = await jose.importJWK({ ...jwk, ext: true }, resolveAlg(jwk));
			if ((key as jose.KeyLike).type !== 'public') {
				continue;
			}
			results.push({
				get publicKey() {
					return key;
				},
				get rsaPublicKey() {
					return key;
				},
				getPublicKey() {
					return key;
				},
				...(typeof jwk.kid === 'string' && jwk.kid ? { kid: jwk.kid } : undefined),
				...(typeof jwk.alg === 'string' && jwk.alg ? { alg: jwk.alg } : undefined),
			});
		} catch (err: any) {
			console.error('Error importing JWK:', err);
			continue;
		}
	}
	return results;
}
