var express   = require( 'express' )
  , query     = require( 'querystring' )
  , _         = require( 'underscore' )
  , config    = {
      api_key: 'GRkvkp3248YFzrRTtTwCUUdKWYLTTsF7'
    , api_secret: 'Yw84Mi8JvqfSIcxPhqw7ls2b3hzXQt7S'
    , game_id: '1CSbCPkVrp2HXg6jH7Sg8s'
    , economy: 'sandbox'
    , port: 8000
  }//require( './config/config' )
  , server    = require( './configure' )( express.createServer() )
  , Betable = require('betable-sdk')({
        api_key      : config.api_key
      , api_secret   : config.api_secret
      , game_id      : config.game_id
      , redirect_uri : 'http://127.0.0.1:8000/callback'
    })

server.get( '/user', function( req, res, next ) {
	if( !req.session.access_token ) {
		req.session.state = Math.floor( Math.random() * 1100000000000 ).toString()
		return Betable.get_user( res, req.session.state )
	}
	Betable.get( ['account', 'wallet'], req.session.access_token, function( error, data ) {
	   return res.render( 'paytable.html', { 
            first_name    : data.account.first_name
          , balance       : data.wallet[config.economy].balance
        })
    })	
})

server.post( '/bet', function( req, res, next ) {    
    var bet_obj = {
       wager    : req.body.wager
     , currency : 'GBP'
     , economy  : config.economy
    }
    
    Betable.bet( bet_obj, req.session.access_token, function( error, body ) {
        if( error ) return res.send( { error: error }, 400 )
        return res.send({
            bet_response: body
          , bet_body    : bet_obj
        }, 200 )
    })
})

server.get( '/callback', function( req, res, next ) {
	var code  = req.query.code
	  , state = req.query.state
	  
    if( !state || state != req.session.state ) {
        delete req.session.state
        return res.send( 400 )
    }
    delete req.session.state
    if( req.query.error ) return res.send( 'we got an error', req.query.error )
    
    Betable.get_access_token( code, function( error, access_token ) {
        if( error ) return res.send( { error: error }, 400 )

        req.session.access_token = access_token
        return res.redirect('/user')
    })
})	

server.listen( config.port )