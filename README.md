Betable Test App
===================

This is a simple test app built on top of the Betable Node.js SDK, and the Betable frontend Javascript SDK.
The game is a configurable slot machine.


Installation
------------
npm install (from the app directory)


Configuration
------------

#### config/configs/base.js

* Update *game_id*
* Update *symbols*
* Update *paylines*

#### config/configs/(real|sandbox).js

* Update *api_key*
* Update *api_secret*

Start the server
------------
NODE_ECONOMY=(sandbox|real) node server.js