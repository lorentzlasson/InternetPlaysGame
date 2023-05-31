FROM denoland/deno:1.34.1

WORKDIR /app

COPY src ./src
COPY deno.jsonc .
COPY import_map.json .

RUN deno cache ./src/main.ts

CMD deno task start
