#!/bin/bash

kysely-codegen \
  --dialect postgres \
  --exclude-pattern refinery_schema_history \
  --camel-case \
  --out-file ./output/db.types.ts
