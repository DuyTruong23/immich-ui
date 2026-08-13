const sha1Hex = async (secret: string, body: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyVercelSignature = async (
  request: Request,
  rawBody: string,
  secret: string,
): Promise<boolean> => {
  const signature = request.headers.get('x-vercel-signature');
  if (!signature) {
    return false;
  }

  const expected = await sha1Hex(secret, rawBody);
  return signature === expected;
};

export type VercelDeploymentWebhook = {
  id: string;
  type: string;
  createdAt?: number;
  payload?: {
    target?: string | null;
    deployment?: {
      id?: string;
      url?: string;
      name?: string;
      meta?: Record<string, string | undefined>;
    };
    links?: {
      deployment?: string;
      project?: string;
    };
    project?: {
      id?: string;
      name?: string;
    };
    errorMessage?: string;
  };
};

export const isDeployNotifyEvent = (type: string): type is 'deployment.succeeded' | 'deployment.error' =>
  type === 'deployment.succeeded' || type === 'deployment.error';
