#!/bin/bash

kysely-codegen \
  --dialect postgres \
  --camel-case \
  --out-file ./output/db.types.ts
