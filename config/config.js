var _           = require( 'underscore' ),
    configs     = {
        base    : require( './configs/base' )
      , sandbox : require( './configs/sandbox' )
      , real    : require( './configs/real' )
    }
  , economy     = process.env.NODE_ECONOMY
  , config      = {}

if( _.indexOf(['real','sandbox'], economy ) == -1 ) {
    console.log( 'Invalid economy: ' + economy )
    process.exit()
}

config = _.extend( configs.base, configs[economy] )

//check commandline for port
config.port    = process.env.NODE_PORT || config.port
config.economy = economy

console.log( "Starting server on port " + config.port + " using a " + economy + " economy" )

module.exports = config
