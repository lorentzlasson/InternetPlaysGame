import * as djwt from 'https://deno.land/x/djwt@v2.9/mod.ts';

export const encodeSecret = (rawJwtSecret: string) =>
  crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(rawJwtSecret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign', 'verify'],
  );

export const create = (sub: string, jwtSecret: CryptoKey) => {
  const header: djwt.Header = { alg: 'HS512', typ: 'JWT' };
  const jwtPayload: djwt.Payload = {
    iss: 'internetplaysgame',
    sub,
  };

  return djwt.create(header, jwtPayload, jwtSecret);
};

export const getSub = async (
  token: string | undefined,
  jwtSecret: CryptoKey,
) => {
  if (!token) return null;

  try {
    const { sub } = await djwt.verify(token, jwtSecret);
    if (!sub) {
      throw new Error('sub not in jwt payload');
    }
    return sub;
  } catch (e) {
    console.log(e);
    return null;
  }
};
