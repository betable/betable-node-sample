var express = require('express')
  , server  = express.createServer()
  , Betable = require('./index')({
        apiKey      : 'YOUR_CLIENT_ID'
      , apiSecret   : 'YOUR_CLIENT_SECRET'
      , redirectUri : 'YOUR_REDIRECT_URI'
})

server.get('/', function( req, res ) {
    var getInformation = function( accessToken ) {
        Betable.get(['wallet','account'], accessToken, function( error, data ) {
            res.send( data )
        })
    }
    
    if( req.query.code ) {
        Betable.token( req.query.code, function( error, accessToken ) {
            if( error ) return res.send( error, 400 )
            getInformation( accessToken )
        })
    } else if( req.query.error ) {
        res.send( req.query )
    } else {
        Betable.authorize( res )
    }
})

server.listen( 8001 )