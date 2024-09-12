import { contentJson, legacyTypeIntoZod, OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';

import { Bindings, FileBody } from '../types';
import { getPreSignedR2Url } from '../utils';

export class UploadFile extends OpenAPIRoute {
	schema = {
		summary: '将图片上传R2',
		description:
			'上传文件到R2，并获得临时链接，可以通过 ```\ncurl -X POST http://localhost:8787/uploads/:file_name \
     -H "Content-Type: multipart/form-data" \
     -F "file=@example.txt" \
     -F "name=example" \\n``` 测试',
		request: {
			params: z.object({
				file_name: z.string().regex(/\.(jpg|jpeg|png|gif|bmp|webp)$/i),
			}),
			body: {
				content: {
					'multipart/form-data': {
						schema: legacyTypeIntoZod({ file: FileBody({ format: 'binary' }) }),
					},
				},
			},
		},
		response: {
			'200': {
				description: '下载链接',
				...contentJson({
					url: z.string().url(),
				}),
			},
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const prefix = 'origin';
		const filename = `${Date.now()}_${nanoid()}`;
		const pathname = `${prefix}/${filename}`;

		try {
			const body = await c.req.parseBody();
			if (!body) {
				return c.json({ error: 'no body' }, 400);
			}
			const file = body['file'] as File;
			const headers = new Headers();
			headers.set('content-type', file.type);

			await c.env.MY_BUCKET.put(pathname, file, { httpMetadata: headers });
		} catch (e: any) {
			return c.json({ error: e.message }, 400);
		}

		const url = new URL(c.req.url);
		return c.json({
			url: url.origin + '/api/uploads/' + filename,
			thumb_url: url.origin + '/cdn-cgi/image/width=200,quality=75/api/uploads/' + filename,
		});
	}
}

export class UploadFilePut extends OpenAPIRoute {
	schema = {
		summary: '将图片上传R2(PUT)',
		description:
			'上传文件到R2，并获得临时链接<br>可以通过 ```\ncurl --upload-file test.png -v -H "Authorization: Bearer 1234" https://a1d-iu.xiongty.workers.dev/api/uploads/test.png``` 测试',
		request: {
			params: z.object({
				file_name: z.string().regex(/\.(jpg|jpeg|png|gif|bmp|webp)$/i),
			}),
			body: {
				content: {
					'application/octet-stream': {
						schema: z.string(),
					},
				},
			},
		},
		response: {
			'200': {
				description: '下载链接',
				...contentJson({
					url: z.string().url(),
				}),
			},
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const prefix = 'origin';
		const filename = `${Date.now()}_${nanoid()}`;
		const pathname = `${prefix}/${filename}`;

		try {
			const body = c.req.raw.body;
			await c.env.MY_BUCKET.put(pathname, body);
		} catch (e: any) {
			return c.json({ error: e.message }, 400);
		}
		const url = new URL(c.req.url);
		return c.json({
			url: url.origin + '/api/uploads/' + filename,
			thumb_url: url.origin + '/cdn-cgi/image/width=200,quality=75/api/uploads/' + filename,
		});
	}
}
