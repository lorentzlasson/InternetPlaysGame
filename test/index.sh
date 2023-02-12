#!/bin/bash

export COMPOSE_FILE=compose.yaml:compose.test.yaml

# Used both by game server and test runner.
# Increase if test gets flaky
export MOVE_SELECTION_MILLIS=500

echo "# STARTING GAME SERVER IN CONTAINER"
docker compose up --detach db
sleep 1 # Not very robust
docker compose up --detach game

echo "# WAIT FOR GAME SERVER TO START"
sleep 1 # Not very robust

echo "# RUN TEST"
docker compose run --rm smoke_test
exit_code=$?

if [ -n "$DEBUG" ]; then
  docker compose logs
fi

echo "# KILL GAME SERVER"
docker compose down 2> /dev/null

exit $exit_code
