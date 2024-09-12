import { Context } from 'hono';
import { Bindings, CacheHandler } from '../../types';
import { JwksClient } from './JwksClient';
import { decode, verify } from 'hono/jwt';

const CACHE_EXPIRY_MS = 60 * 60 * 3; // 3 minutes

async function getActivePublicKey({ token, cacheHandler }: { token: string; cacheHandler: CacheHandler }) {
	const decoded = decode(token);
	if (!decoded) {
		throw new Error('Invalid token');
	}

	const { kid } = decoded.header as any;
	const appid = decoded.payload.aud as string;

	const jwks = new JwksClient({
		jwksUri: `https://api.canva.com/rest/v1/apps/${appid}/jwks`,
		cacheHandler,
	});

	const key = await jwks.getSigningKey(kid);
	return { appid, kid, pubkey: key.getPublicKey() };
}

export async function verifyToken(token: string, c: Context<{ Bindings: Bindings }>) {
	if (!token) {
		return false;
	}
	if (token === c.env.ADMIN_TOKEN) {
		c.set('jwtPayload', { aud: 0, brandId: 0, userId: 0 });
		return true;
	}

	function cacheFactory(c: Context<{ Bindings: Bindings }>) {
		const prefix = 'PUB_KEY_';
		return {
			get(key: string) {
				return c.env.MY_KV_NAMESPACE.get(prefix + key);
			},
			set(key: string, value: string, ttl = CACHE_EXPIRY_MS) {
				return c.env.MY_KV_NAMESPACE.put(prefix + key, value, { expirationTtl: ttl });
			},
			del(key: string) {
				return c.env.MY_KV_NAMESPACE.delete(prefix + key);
			},
		};
	}
	try {
		const {appid, pubkey} = await getActivePublicKey({
			token,
			cacheHandler: cacheFactory(c),
		});
		const app_ids = c.env.CANVA_APP_IDS.split(',');
		if (!app_ids.includes(appid)) {
			return false;
		}
		
		const verified = await verify(token, pubkey, 'RS256');
		if (!verified.aud || !verified.brandId || !verified.userId) {
			return false;
		} else {
			c.set('jwtPayload', verified);
			return true;
		}
	} catch (error) {
		return false;
	}


}
