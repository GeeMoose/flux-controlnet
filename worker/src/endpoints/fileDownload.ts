import { legacyTypeIntoZod, OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';

import { Bindings, FileBody } from '../types';

export class DownloadFile extends OpenAPIRoute {
	schema = {
		summary: '下载R2上的图片',
		description: '',
		request: {
			params: z.object({
				file_name: z.string(),
			}),
		},
		response: {
			200: {
				description: '下载链接',
				content: {
					'image/*': {
						schema: legacyTypeIntoZod({ file: FileBody({ format: 'binary' }) }),
					},
				},
			},
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const prefix = 'origin';
		const pathname = `${prefix}/${data.params.file_name}`;

		const object = await c.env.MY_BUCKET.get(pathname);

		if (object === null) {
			c.status(404);
			return c.json({ error: 'not found' });
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.forEach((value, key) => {
			c.header(key, value);
		});
		c.header('etag', object.httpEtag);

		return c.body(object.body);
	}
}
