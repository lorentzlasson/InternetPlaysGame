#!/bin/bash

# All future databases will have this schema by default
psql -d template1 -f schema.sql

echo $POSTGRES_DB

DB="$POSTGRES_DB" ./util/reset_db.sh
DB="$POSTGRES_TEST_DB" ./util/reset_db.sh
