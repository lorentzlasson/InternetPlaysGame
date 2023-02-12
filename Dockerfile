FROM denoland/deno:1.30.3

WORKDIR /app

COPY src ./src
COPY deno.jsonc .
COPY import_map.json .

RUN deno cache ./src/main.ts --import-map=import_map.json

CMD deno task start
