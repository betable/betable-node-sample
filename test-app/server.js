var express = require( 'express' )
  , server  = express.createServer()
  , http    = require( 'https' )
  , query   = require( 'querystring' )
  , _       = require( 'underscore' )

var economy       = 'sandbox'
  , client_id     = 'j4lAcOwsZ8Wdh6DObWxaYzg2sHfppF6t'
  , client_secret = 'C62RUr2nTjAjdlCxowxCAr8VzMqdWSlp'
  , game_id       = 'GaAIytlJEfvjJY15JbSueP'
  , authorize_url = 'https://betable.com/authorize'
  , callback_url  = 'http://127.0.0.1:8000/callback'
  , betable_host  = 'api.betable.com'
  , betable_port  = 443
  , configuration = {
        symbols:["smurf","fart","potato","zebra","billboard","goat"]
      , window:[3,3]
      , reels:[["zebra","smurf","fart","zebra","billboard","zebra","potato","smurf","potato","smurf","potato","potato","zebra","smurf","zebra","goat","potato","zebra","zebra","potato","billboard","potato","goat","potato"],["fart","goat","billboard","goat","goat","goat","potato","goat","smurf","zebra","fart","zebra","goat","fart","goat","billboard","smurf","smurf","billboard","billboard","smurf","goat","goat","potato"],["billboard","zebra","goat","fart","goat","smurf","goat","fart","smurf","smurf","zebra","zebra","potato","smurf","goat","zebra","potato","goat","goat","goat","goat","zebra","goat","potato"]]
      , paylines:[[0,0,0],[1,1,1],[2,2,2],[0,1,2],[2,1,0]]
    }

server.use( express.bodyParser() )
server.use( express.cookieParser() )
server.set( 'view options', { layout: false } ) 
server.set( 'views', __dirname + '/' )
server.register( '.html', {
    compile: function (str, options) {
        _.templateSettings = { 
            interpolate : /\{\{-([\s\S]+?)\}\}/g 
          , escape      : /\{\{([^-]|[^-][\s\S]+?)\}\}/g 
          , evaluate    : /\{\[([\s\S]+?)\]\}/g
        }
        var template = _.template(str)
        return function (locals) {
            return template(locals)
        }
    }
})

server.use( function( req, res, next ) {
	req.session = JSON.parse(req.cookies[ 'sid' ] || '{}' )
	
	res.on('header', function(){
		res.cookie( 'sid', JSON.stringify(req.session) ) 
	})
	next()
})

var httpme = function( request, callback ) {
    var r = http.request( request )
	r.on('response', function( result ) {
        var buf = ''
        result.setEncoding('utf8');
        result.on('data', function(chunk){ buf += chunk })
        result.on('end', function(){
            var data = buf
            try {
                data = JSON.parse( buf )
            } catch( e ) {}
            result.body = data;
            
            callback( result )
        })
    }).end()
}


server.get( '/user', function( req, res, next ) {
	if( !req.session.access_token ) {
		req.session.state = Math.floor( Math.random() * 1100000000000 ).toString()
		return res.redirect( authorize_url + '?client_id='+client_id+'&redirect_uri=' + escape( callback_url ) + '&response_type=code&state=' + req.session.state )
	}	
	
	// Get the user object from betable API and display it
	httpme({
	   host   : betable_host, 
	   port   : betable_port, 
	   path   : '/1.0/account?access_token='+req.session.access_token,
	   method : 'GET'
    }, function( result_account ) {
        if( result_account.statusCode != 200 ) return res.send( result_account.body, result_account.statusCode )
        
        httpme({
            host: betable_host
          , port: betable_port
          , path: '/1.0/account/wallet?access_token='+req.session.access_token
          , method: 'GET'
        }, function( result_wallet ) {
            var body = {
                account: result_account.body
              , wallet : result_wallet.body
            }
            
            return res.render( 'game.html', { 
                first_name: body.account.first_name
              , balance   : body.wallet[economy].balance
              , configuration: configuration
            })
        })
    })
		
})

server.post( '/bet', function( req, res, next ) {
    
    /*var payl = []
    if( typeof req.body.paylines != 'object' ) req.body.paylines = [ req.body.paylines ]
    for( p in req.body.paylines ) {
        payl.push( JSON.parse( req.body.paylines[p] ) )
    }*/
    
    _.each( req.body.paylines, function( payline, index ) {
        req.body.paylines[ index ] = []
        _.each( payline, function( p ) {
            req.body.paylines[ index ].push( +p )
        })
    })
    
    var body = {
       wager: req.body.wager
     , currency: 'GBP'
     , economy: economy
     , location: {
           latitude: 0
         , longitude: 0
       }
     , paylines: req.body.paylines
    }
    
    var r = http.request({
	   host   : betable_host 
	 , port   : betable_port
	 , path   : '/1.0/game/'+game_id+'/bet?access_token='+req.session.access_token
	 , method : 'POST'
     , headers: {
	       'content-type': 'application/json; charset=UTF-8'
	     , 'content-length': JSON.stringify(body).length
	   }
    })
    
    r.write( JSON.stringify( body ) )
	r.on('response', function( response ) {
        var buf = ''
        response.setEncoding('utf8');
        response.on('data', function(chunk){ buf += chunk })
        response.on('end', function(){
            var data = buf
            try {
                data = JSON.parse( buf )
            } catch( e ) {}
            //console.log( data, response.statusCode )
            response.body = data;
            
            if( response.statusCode != 201 ) {
                return res.send( response.body, response.statusCode )
            }
            
            //console.log( JSON.stringify( response.body ))
            
            return res.send( response.body )
            
            res.redirect( '/user?outcome=' + JSON.stringify(response.body.window) + '&payout=' + response.body.payout + '&paylines=' + JSON.stringify(req.body.paylines))
        })
    }).end()
})

server.get( '/callback', function( req, res, next ) {
	// Got callback. User has authorized me. Exchange
    // authorization token for access token, put it
	// in the session, and redirect to /user.
	var code  = req.query.code
	  , state = req.query.state
	  
    if( !state || state != req.session.state ) {
        delete req.session.state
        return res.send( 400 )
    }
    delete req.session.state
    if( req.query.error ) {
        return res.send( 'we got an error: ' + req.query.error )
    }
console.log('party')
    console.log({
	   host:betable_host
     , port:betable_port
     , path: '/1.0/token'
     , method: 'POST'
     , headers: {
		'content-type': 'application/x-www-form-urlencoded',
		authorization: 'Basic ' + new Buffer( client_id + ':' + client_secret ).toString('base64')
	}})
	var body = query.stringify({
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: 'http://127.0.0.1:8000/callback'
	})
	var r = http.request({
	   host:betable_host
     , port:betable_port
     , path: '/1.0/token'
     , method: 'POST'
     , headers: {
		'content-type': 'application/x-www-form-urlencoded'
      , authorization: 'Basic ' + new Buffer( client_id + ':' + client_secret ).toString('base64')
      , 'Content-Length': body.length
	}})
	r.on('error', function(err) {
    console.log('unable to connect to ' + err);
});
	console.log('party2')
	//console.log( 'about to write data' )
	r.write( body )
	console.log( 'about to response' )
	r.on('response', function( result ) {
	    //return console.log('got response')
	    var buf = ''
        result.setEncoding('utf8');
        result.on('data', function(chunk){ buf += chunk })
        result.on('end', function(){
            result.body = buf;
            if( result.statusCode != 200 ) return res.send( "result is " + result.body )
    		req.session.access_token = JSON.parse( result.body ).access_token
    		return res.redirect( '/user' )
        })
	})
	console.log( 'about to end' )
	r.end()

})	

server.listen( 8000 )
