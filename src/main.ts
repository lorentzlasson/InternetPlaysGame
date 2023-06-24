import { Application, Router } from 'https://deno.land/x/oak@v12.5.0/mod.ts';
import {
  create,
  decode,
  Header,
  Payload,
  verify,
} from 'https://deno.land/x/djwt@v2.9/mod.ts';
import { executeNextMove, getUiState, init, recordMove } from './game.ts';
import { isDirection } from './common.ts';
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  jwtSecret as rawJwtSecret,
  secureCookie,
} from './config.ts';
import ui from './ui/main.tsx';

const PORT = 8000;

const gameId = await init();

executeNextMove(gameId);

const jwtSecret = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(rawJwtSecret),
  { name: 'HMAC', hash: 'SHA-512' },
  false,
  ['sign', 'verify'],
);

const router = new Router();

router
  .get('/favicon.ico', async (ctx) => {
    const faviconPath = `./src/ui/gamepad.svg`;
    const faviconContent = await Deno.readFile(faviconPath);
    ctx.response.body = faviconContent;
    ctx.response.type = 'image/svg+xml';
  })
  .get('/', async (ctx) => {
    const state = await getUiState(gameId);
    const html = ui(state);
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
      return;
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

    if (!token) {
      ctx.response.status = 302;
      ctx.response.headers.set('Location', '/auth');
      return;
    }

    const { sub } = await verify(token, jwtSecret);

    if (!sub) {
      ctx.response.status = 500;
      return;
    }

    const body = ctx.request.body();
    const formData = await body.value;
    const direction = formData.get('direction');

    if (isDirection(direction)) {
      await recordMove(gameId, direction, sub);

      ctx.response.status = 302;
      ctx.response.headers.set('Location', '/');
    } else {
      ctx.response.status = 400;
    }
  });

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: PORT });
