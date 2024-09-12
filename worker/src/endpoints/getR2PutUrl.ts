import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';

import { Bindings } from '../types';
import { getPreSignedR2Url } from '../utils';

export class GetR2PutUrl extends OpenAPIRoute {
	schema = {
		summary: '获得R2上传下载的临时链接',
		description: '获得R2文件的临时链接，可以通过 `curl -T filename.ext response.data.url` 测试',
		request: {
			params: z.object({
				file_name: z.string().regex(/\.(jpg|jpeg|png|gif|bmp|webp)$/i),
			}),
		},
		response: {
			200: z.object({
				put_url: z.string().url(),
				get_url: z.string().url(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const data = await this.getValidatedData<typeof this.schema>();

		const prefix = 'origin'; // 建议在 Object lifecycle rules 中增加一条规则，将 prefix 为 'origin/' 的文件设置过期时间
		const pathname = `${prefix}/${Date.now()}_${nanoid()}_${data.params.file_name}`; // 上传的文件名

		const [putUrl, getUrl] = await Promise.all([
			getPreSignedR2Url(
				c.env.ACCOUNT_ID,
				c.env.BUCKET_NAME,
				c.env.R2_ACCESS_KEY_ID,
				c.env.R2_SECRET_ACCESS_KEY,
				pathname,
				3600, // 预先签名链接有效时间 1 小时
				'PUT'
			),
			getPreSignedR2Url(c.env.ACCOUNT_ID, c.env.BUCKET_NAME, c.env.R2_ACCESS_KEY_ID, c.env.R2_SECRET_ACCESS_KEY, pathname, 3600, 'GET'),
		]);

		return c.json({ put_url: putUrl, get_url: getUrl });
	}
}
