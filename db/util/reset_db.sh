echo "Reseting database $DB"
dropdb --if-exists --username=postgres --force ${DB}
createdb --username=postgres ${DB}
