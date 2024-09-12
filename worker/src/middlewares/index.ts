import { createMiddleware } from 'hono/factory';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { verifyToken } from './jwt';
import { Bindings, Variables } from '../types';


export const authMiddleware = createMiddleware(async (c: Context, next) => {
	const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*';
	const PREFIX = 'Bearer';
	const HEADER = 'Authorization';

	const headerToken = c.req.header(HEADER);
	if (!headerToken) {
		// No Authorization header
		const res = new Response('Unauthorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': `${PREFIX} realm="` + '"',
			},
		});
		throw new HTTPException(401, { res });
	} else {
		const regexp = new RegExp('^' + PREFIX + ' +(' + TOKEN_STRINGS + ') *$');
		const match = regexp.exec(headerToken);
		if (!match) {
			// Invalid Request
			const res = new Response('Bad Request', {
				status: 400,
				headers: {
					'WWW-Authenticate': `${PREFIX} error="invalid_request"`,
				},
			});
			throw new HTTPException(400, { res });
		} else {
			let equal = await verifyToken(match[1], c);
			if (!equal) {
				// Invalid Token
				const res = new Response('Unauthorized', {
					status: 401,
					headers: {
						'WWW-Authenticate': `${PREFIX} error="invalid_token"`,
					},
				});
				throw new HTTPException(401, { res });
			}
		}
	}
	await next();
});

export const durableObjectMiddleware = createMiddleware(async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next) => {
	const id = c.env.TASK_STATUS_DURABLE_OBJECT.idFromName('a1d-rb-task-status');
	const stub = c.env.TASK_STATUS_DURABLE_OBJECT.get(id);
	c.set('stub', stub);
	await next();
});
