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
import ui from './ui/main.tsx';
import statsUi from './ui/stats.tsx';

const PORT = 8000;

const gameId = await init();

const jwtSecret = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(rawJwtSecret),
  { name: 'HMAC', hash: 'SHA-512' },
  false,
  ['sign', 'verify'],
);

const router = new Router();

const getSubFromJwt = async (token: string | undefined) => {
  if (!token) return;

  try {
    const { sub } = await verify(token, jwtSecret);
    if (!sub) {
      throw new Error('sub not in jwt payload');
    }
    return sub;
  } catch (e) {
    console.log(e);
    return;
  }
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

    const state = await getUiState(gameId, playerName);
    const html = ui(state);
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  })
  .get('/stats', async (ctx) => {
    const state = await getStatsUiState(gameId);
    const html = statsUi(state);
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  })
  .get('/auth', (ctx) => {
    const baseURL = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: 'code',
      scope: 'openid',
    });
    ctx.response.redirect(`${baseURL}?${params}`);
  })
  .get('/auth/callback', async (ctx) => {
    const code = ctx.request.url.searchParams.get('code');
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

    ctx.response.status = 302;
    ctx.response.headers.set('Location', '/');
  })
  .post('/move', async (ctx) => {
    const token = await ctx.cookies.get('auth');
    const playerName = await getSubFromJwt(token);

    if (!playerName) {
      ctx.response.status = 302;
      ctx.response.headers.set('Location', '/auth');
      return;
    }

    const body = ctx.request.body({ type: 'form' });
    const formData = await body.value;
    const direction = formData.get('direction');

    if (isDirection(direction)) {
      await recordMove(gameId, direction, playerName);

      ctx.response.status = 302;
      ctx.response.headers.set('Location', '/');
    } else {
      ctx.response.status = 400;
    }
  })
  .post('/tick', async (ctx) => {
    const apiKey = ctx.request.headers.get('x-api-key');

    if (!apiKey || apiKey !== tickerApiKey) {
      ctx.response.status = 403;
      return;
    }

    await tick(gameId);

    ctx.response.status = 200;
    return;
  });

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: PORT });
