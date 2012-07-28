var _           = require( 'underscore' ),
    configs     = {
        base    : require( './configs/base' )
      , sandbox : require( './configs/sandbox' )
      , real    : require( './configs/real' )
    }
  , env         = process.env.NODE_ENV
  , economy     = process.env.NODE_ECONOMY
  , config      = {}

if( _.indexOf(['real','sandbox'], economy ) == -1 ) {
    console.log( 'Invalid economy: ' + economy )
    process.exit()
}
if( _.indexOf(['production','development'], env ) == -1 ) {
    console.log( 'Invalid env: ' + env )
    process.exit()
}

config = _.extend( configs.base, configs[economy] )

//check commandline for port
config.port    = process.env.NODE_PORT || config.port
config.economy = economy

console.log( "Starting server on port " + config.port + " in " + env + " mode using a " + economy + " economy" )

module.exports = config
