var _           = require( 'underscore' ),
    configs     = {
        base    : require( './configs/base' )
      , sandbox : require( './configs/sandbox' )
      , real    : require( './configs/real' )
    }
  , economy     = process.env.NODE_ECONOMY
  , mode        = process.env.NODE_MODE
  , config      = {}

if( _.indexOf(['real','sandbox'], economy ) == -1 ) {
    console.log( 'Invalid economy: ' + economy )
    process.exit()
}

config = _.extend( configs.base, configs[economy], configs[mode] )

//check commandline for port
config.port     = process.env.NODE_PORT || config.port
config.economy  = economy
config.mode     = mode

console.log( "Starting server on port " + config.port + " using a " + economy + " economy" )
if(mode == 'unbacked'){
  console.log("Bets will be unbacked")
}

module.exports = config
