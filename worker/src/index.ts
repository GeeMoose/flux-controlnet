/**
 * Run `npm run dev` in your terminal to start a development server
 * Open a browser tab at http://localhost:8787/ to see your worker in action
 * Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware, durableObjectMiddleware } from './middlewares';

import { TaskStatusDurableObject } from './durableObjects';

import { GetR2PutUrl } from './endpoints/getR2PutUrl';
import { CreateTask } from './endpoints/taskCreate';
import { FetchTask } from './endpoints/taskFetch';
import { UpdateTask } from './endpoints/taskUpdate';
import { UploadFile, UploadFilePut } from './endpoints/fileUpload';
import { DownloadFile } from './endpoints/fileDownload';
import { UserInfo } from './endpoints/userInfo';
import { FetchBill } from './endpoints/billFetch';
import { FetchTaskSSE } from './endpoints/taskFetchSSE';

// Star a Hono app
const app = new Hono();

app.use(
	'/api/*',
	cors({
		credentials: true,
		origin: '*',
	})
);

// Setup OpenAPI registry
const options = {
	docs_url: '/',
	schema: {
		info: {
			title: 'Remove background Worker API',
			version: '1.0',
		},
		servers: [
			{
				url: '/',
				description: 'Development server',
			},
			{
				url: 'https://a1d-rb.k-xshar.workers.dev/',
				description: 'Production server',
			},
		],
		security: [
			{
				BearerAuth: [],
			},
		],
	},
};
const openapi = fromHono(app, options);

openapi.registry.registerComponent('securitySchemes', 'BearerAuth', {
	type: 'http',
	scheme: 'bearer',
	bearerFormat: 'JWT',
});

// Register OpenAPI endpoints
openapi.get('/api/uploads/:file_name/url', authMiddleware, GetR2PutUrl);
openapi.post('/api/uploads/:file_name', authMiddleware, UploadFile);
openapi.put('/api/uploads/:file_name', authMiddleware, UploadFilePut);
openapi.get('/api/uploads/:file_name', DownloadFile);

openapi.get('/api/user', authMiddleware, UserInfo);

openapi.post('/api/task', authMiddleware, CreateTask);
openapi.get('/api/task/:id', durableObjectMiddleware, FetchTask);
openapi.get('/api/task/:id/sse', durableObjectMiddleware, FetchTaskSSE);
openapi.patch('/api/task/:id', authMiddleware, durableObjectMiddleware, UpdateTask);

openapi.get('/admin/bill', FetchBill);

export { TaskStatusDurableObject };

// Export the Hono app
export default app;
