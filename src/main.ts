import { Application, Router } from 'https://deno.land/x/oak@v12.5.0/mod.ts';
import {
  create,
  decode,
  Header,
  Payload,
  verify,
} from 'https://deno.land/x/djwt@v2.9/mod.ts';
import { getStatsUiState, getUiState, init, recordMove, tick } from './game.ts';
import { isDirection } from './common.ts';
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  jwtSecret as rawJwtSecret,
  secureCookie,
  tickerApiKey,
} from './config.ts';
import mobileUi from './ui/mobile.tsx';
import desktopUi from './ui/desktop.tsx';
import statsUi from './ui/stats.tsx';
import infoUi from './ui/info.tsx';

const PORT = 8000;

await init();

const jwtSecret = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(rawJwtSecret),
  { name: 'HMAC', hash: 'SHA-512' },
  false,
  ['sign', 'verify'],
);

const router = new Router();

const getSubFromJwt = async (token: string | undefined) => {
  if (!token) return null;

  try {
    const { sub } = await verify(token, jwtSecret);
    if (!sub) {
      throw new Error('sub not in jwt payload');
    }
    return sub;
  } catch (e) {
    console.log(e);
    return null;
  }
};

const buildOauthRedirectUrl = (state: string | null = null) => {
  const baseURL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const baseParams = {
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: 'code',
    scope: 'openid',
  };
  const params = state ? { ...baseParams, state } : baseParams;
  const queryParams = new URLSearchParams(params);
  return `${baseURL}?${queryParams}`;
};

router
  .get('/favicon.ico', async (ctx) => {
    const faviconPath = `./src/ui/gamepad.svg`;
    const faviconContent = await Deno.readFile(faviconPath);
    ctx.response.body = faviconContent;
    ctx.response.type = 'image/svg+xml';
  })
  .get('/', async (ctx) => {
    const token = await ctx.cookies.get('auth');
    const playerName = await getSubFromJwt(token);

    const state = await getUiState(playerName);

    const userAgent = ctx.request.headers.get('User-Agent') || '';

    const html = /mobile/i.test(userAgent) ? mobileUi(state) : desktopUi(state);

    ctx.response.body = html;
    ctx.response.type = 'text/html';
  })
  .get('/stats', async (ctx) => {
    const state = await getStatsUiState();
    const html = statsUi(state);
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  })
  .get('/info', (ctx) => {
    const html = infoUi();
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  })
  .get('/auth', (ctx) => {
    const url = buildOauthRedirectUrl();
    console.log({ url });
    ctx.response.redirect(url);
  })
  .get('/auth/callback', async (ctx) => {
    const code = ctx.request.url.searchParams.get('code');
    const direction = ctx.request.url.searchParams.get('state');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();
    const [, oauthPayload] = decode(tokenData.id_token);
    if (
      !(typeof oauthPayload === 'object' && oauthPayload !== null &&
        'sub' in oauthPayload &&
        typeof oauthPayload.sub === 'string')
    ) {
      ctx.response.status = 500;
      throw new Error('sub not in google payload');
    }

    const header: Header = { alg: 'HS512', typ: 'JWT' };
    const jwtPayload: Payload = {
      iss: 'internetplaysgame',
      sub: oauthPayload.sub,
    };

    const jwt = await create(header, jwtPayload, jwtSecret);

    ctx.cookies.set('auth', jwt, {
      httpOnly: true,
      secure: secureCookie,
    });

    if (isDirection(direction)) {
      await recordMove(direction, oauthPayload.sub);
    }

    ctx.response.status = 302;
    ctx.response.headers.set('Location', '/');
  })
  .post('/move', async (ctx) => {
    const token = await ctx.cookies.get('auth');
    const playerName = await getSubFromJwt(token);

    const body = ctx.request.body({ type: 'form' });
    const formData = await body.value;
    const direction = formData.get('direction');

    if (!isDirection(direction)) {
      ctx.response.status = 400;
      return;
    }

    if (!playerName) {
      const url = buildOauthRedirectUrl(direction);
      console.log({ url });
      ctx.response.redirect(url);
      return;
    }

    await recordMove(direction, playerName);
    ctx.response.status = 302;
    ctx.response.headers.set('Location', '/');
  })
  .post('/tick', async (ctx) => {
    const apiKey = ctx.request.headers.get('x-api-key');

    if (!apiKey || apiKey !== tickerApiKey) {
      ctx.response.status = 403;
      return;
    }

    await tick();

    ctx.response.status = 200;
    return;
  });

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: PORT });
