#!/bin/bash

# source .env file
# https://stackoverflow.com/a/30969768/1859989
set -o allexport
source .env
set +o allexport

echo "# STARTING GAME SERVER IN CONTAINER"
docker compose up --detach db
sleep 2 # Not very robust

# Clear database from data from previous run
docker compose exec --env=DB=${POSTGRES_TEST_DB} db bash -c "./util/reset_db.sh"

POSTGRES_DB=${POSTGRES_TEST_DB} docker compose up --detach game

echo "# RUN TEST"
docker compose run --rm smoke_test
exit_code=$?

if [ -n "$DEBUG" ] || [ $exit_code -ne 0 ]; then
  docker compose logs game --timestamps
fi

echo "# KILL GAME SERVER"
docker compose stop game
docker compose rm --force game

exit $exit_code
