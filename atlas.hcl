env "local" {
  src = "./db/src/schema.sql"
  url = "postgresql://postgres:foo@localhost:5432/game?search_path=public&sslmode=disable"
  dev = "docker://postgres/15"

  migration {
      dir = "file://db/migrations"
  }
}
