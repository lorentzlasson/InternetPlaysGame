FROM denoland/deno:1.30.3

WORKDIR /app

RUN apt update && \
    apt install -y wget && \
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt install -y ./google-chrome-stable_current_amd64.deb

COPY src/common.ts ./src/common.ts
COPY test ./test
COPY deno.jsonc .
COPY import_map.json .

RUN deno cache ./test/smoke_test.ts --import-map=import_map.json

CMD deno task test
