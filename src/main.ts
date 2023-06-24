import { Application, Router } from 'https://deno.land/x/oak@v12.5.0/mod.ts';
import { executeNextMove, getUiState, init, recordMove } from './game.ts';
import { isDirection } from './common.ts';
import ui from './ui/main.tsx';

const PORT = 8000;

const gameId = await init();

executeNextMove(gameId);

const router = new Router();

router
  .get('/favicon.ico', async (context) => {
    const faviconPath = `./src/ui/gamepad.svg`;
    const faviconContent = await Deno.readFile(faviconPath);
    context.response.body = faviconContent;
    context.response.type = 'image/svg+xml';
  })
  .get('/', async (context) => {
    const state = await getUiState(gameId);
    const html = ui(state);
    context.response.body = html;
    context.response.type = 'text/html';
  })
  .post('/move', async (context) => {
    const body = context.request.body();
    const formData = await body.value;
    const playerName = formData.get('playerName');
    const direction = formData.get('direction');

    if (playerName && isDirection(direction)) {
      await recordMove(gameId, direction, playerName.toString());

      context.response.status = 302;
      context.response.headers.set('Location', '/');
    } else {
      context.response.status = 400;
    }
  });

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: PORT });
