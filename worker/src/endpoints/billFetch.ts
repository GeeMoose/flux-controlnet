import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';
import { Bindings } from '../types';

export class FetchBill extends OpenAPIRoute {
	schema = {
		summary: '实时获取账单',
		description: `实时获取账单数据，时间范围为 start 到 end`,
		request: {
			query: z.object({
				start: z.number().int().optional(),
				end: z.number().int().optional(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const start = new Date(data.query.start || 0);
		const end = new Date(data.query.end || Date.now());
		const query = `SELECT * FROM A1D_RB_BILLING`;
		const API = `https://api.cloudflare.com/client/v4/accounts/${c.env.ACCOUNT_ID}/analytics_engine/sql`;
		const response = await fetch(API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${c.env.API_TOKEN}`,
			},
			body: query,
		});
		
		const result = await response.text();
		return c.text(result);
	}
}
