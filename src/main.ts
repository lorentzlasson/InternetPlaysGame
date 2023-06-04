import 'loadEnv';
import { serve } from 'http_server';
import { executeNextMove, getUiState, init, recordMove } from './game.ts';
import { isDirection } from './common.ts';
import ui from './ui/main.tsx';

const PORT = 8000;

const gameId = await init();

executeNextMove(gameId);

await serve(
  async (req) => {
    if (req.method === 'GET') {
      const { pathname } = new URL(req.url);

      if (pathname.startsWith('/favicon.ico')) {
        const file = await Deno.open('./src/ui/gamepad.svg');
        return new Response(file.readable, {
          headers: {
            'content-type': 'image/svg+xml',
          },
        });
      }

      const state = await getUiState(gameId);
      const html = ui(state);
      return new Response(html, {
        headers: {
          'content-type': 'text/html',
        },
      });
    }

    if (req.method === 'POST') {
      const formData = await req.formData();
      const playerName = formData.get('playerName');
      const direction = formData.get('direction');
      if (playerName) {
        if (isDirection(direction)) {
          await recordMove(gameId, direction, playerName.toString());

          return new Response(null, {
            headers: {
              location: '/',
            },
            status: 302,
          });
        }
      }

      return new Response(null, { status: 400 });
    }

    return new Response(null, { status: 405 });
  },
  { port: PORT },
);
