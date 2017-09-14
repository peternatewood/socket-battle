# <a href="https://still-falls-22958.herokuapp.com/" target="_blank">Socket IO Sea Battle</a>

Two-player board game adaptation utilizing socket io.

## Database Setup

The app uses either a MySQL or Postgres server to handle users and login tokens. Use environment variables to provide the database name and access credentials. If any variables are unavailable, the app will default to the following settings:

    DB_HOST='localhost'
    DB_USER='root'
    DB_PASSWORD='root'
    DB_NAME='socket_battle'

`DATABASE_URL` will override the above settings, for easy compatibility with Heroku deployment.

The `users` table should use the following schema:

|Column Name  |Data Type|Length|
|-------------|---------|------|
|username     |VARCHAR  |255   |
|password_hash|VARCHAR  |255   |
|token        |VARCHAR  |56    |
|created_at   |DATETIME |      |
|updated_at   |DATETIME |      |
