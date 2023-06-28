`cd db`

## Create migration

1. Create file `atlas migrate new <NAME>`
1. Generate content `tusker diff database schema` Atlas cant handle domains yet
   https://github.com/ariga/atlas/issues/1512 Tusker is useful in the meantime
1. Rehash `atlas migrate hash`

## Run migrations

`atlas migrate apply --url $DB_URL`
