import { AwsClient } from 'aws4fetch';

export const getPreSignedR2Url = async (
	accountID: string,
	bucketName: string,
	accessKeyId: string,
	secretAccessKey: string,
	pathname: string,
	expires: number,
	method: 'GET' | 'PUT'
) => {
	const r2 = new AwsClient({
		accessKeyId,
		secretAccessKey,
	});

	const url = new URL(`https://${bucketName}.${accountID}.r2.cloudflarestorage.com`);
	url.pathname = pathname;
	url.searchParams.set('X-Amz-Expires', expires.toString());

	const signed = await r2.sign(new Request(url, { method }), { aws: { signQuery: true } });
	return signed.url;
};
