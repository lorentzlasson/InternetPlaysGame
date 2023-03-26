#!/bin/bash

# To simplify db reset
createdb --username=postgres my_template
psql -d my_template -f schema.sql

DB="$POSTGRES_DB" ./util/reset_db.sh
DB="$POSTGRES_TEST_DB" ./util/reset_db.sh
