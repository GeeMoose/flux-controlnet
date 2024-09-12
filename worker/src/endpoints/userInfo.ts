import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';


import { Bindings } from '../types';

export class UserInfo extends OpenAPIRoute {
    schema = {
        summary: '获取用户信息',
        description: '',
        response: {
            200: {
                description: 'userId',
                content: {
                },
            },
        },
    };

    async handle(c: Context<{ Bindings: Bindings }>) {
        // const data = await this.getValidatedData<typeof this.schema>();
        const jwtPayload = c.get('jwtPayload');
        if (!jwtPayload) {
            return c.json({ error: 'jwtPayload not found' }, 401);
        }
        
        let result = {
            userId: jwtPayload.userId
        }

        return c.json(result);
    }
}
