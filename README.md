# [Socket IO Sea Battle](https://still-falls-22958.herokuapp.com/)

Two-player board game adaptation utilizing socket io. Try it out [here](https://still-falls-22958.herokuapp.com/), and bring along a friend so you can actually play :sweat_smile:

## Playing the Game

When you first load the page, you'll need to choose a username and password to use. Your username will be the name displayed on your opponent's screen during a match, so choose well. From the main menu, you can enter the Options menu to change color settings and toggle sound, start a new game, or _enter a tournament (this mode still in development)_

### Setup stage
When starting a new game, you must first place all seven of your ships on the board. Click with the left mouse button and drag each ship onto the board. Click the right mouse button or spacebar while holding a ship to rotate it 90 degrees clockwise. Click the red **FIRE!** button at the bottom of the game screen when you're ready to start. If another player is already waiting, you'll be automatically matched up. Otherwise, you'll have to wait for another player to place their pieces and start the game.

### Game rounds
The player who set up their game first, plays first. Left click on any tile in the right-side grid to choose a target, and click the **FIRE!** button to fire a salvo. After a short sound and animation, you'll be informed whether you hit or missed any of your opponent's ships. Each round continues like this until all of your, or your opponent's, ships have been sunk; the **VICTORY** or **DEFEAT** message will display, and you can click anywhere in the game screen to return to the main menu.

## Local Setup

### Database
The app uses either a MySQL or Postgres server to handle users and login tokens. Use environment variables to provide the database name and access credentials. If any variables are unavailable, the app will default to the following settings:

    DB_TYPE='postgres'
    DB_HOST='localhost'
    DB_USER='root'
    DB_PASSWORD='root'
    DB_NAME='socket_battle'

`DATABASE_URL` will override the above settings (except for DB_TYPE) for easy compatibility with Heroku deployment.

The `users` table should use the following schema:

|Column Name  |Data Type|Length|
|-------------|---------|------|
|username     |string   |255   |
|password_hash|string   |56    |
|token        |string   |56    |
|is_admin     |boolean  |1     |
|created_at   |timestamp|      |
|updated_at   |timestamp|      |

Note that although the password_hash and login token are generated using sha1, the password-hash library generates a string 56 characters long.

### Node
To run the app locally, you'll need [Node.js](https://nodejs.org/en/) and the [Node Package Manager (npm)](https://www.npmjs.com/). Node v4 or better should be good enough. Once you have them installed, navigate to the root directory of the project and run `npm install` to install all dependencies, like [ExpressJS](https://expressjs.com) and [Socket.io](https://socket.io). Finally, compile the scripts using `grunt uglify`.

Run the node server with `npm battle.js` and just open localhost:4500 in your browser to start playing!
