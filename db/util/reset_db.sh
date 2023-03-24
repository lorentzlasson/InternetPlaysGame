echo "Reseting database $DB"
dropdb --if-exists --username=postgres --force ${DB}
createdb --template=my_template --username=postgres ${DB}
