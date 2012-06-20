var express = require( 'express' )
  , server  = express.createServer()
  , query   = require( 'querystring' )
  , _       = require( 'underscore' )
  , economy = process.env.NODE_ECONOMY
  , env     = process.env.NODE_ENV
  
if( _.indexOf(['real','sandbox'], economy) == -1 ) {
    console.log( 'Invalid economy: ' + economy )
    process.exit()
}
if( _.indexOf(['production','development'], env) == -1 ) {
    console.log( 'Invalid env: ' + env )
    process.exit()
}

var game_id       = 'U7unzZjEeWP9P2UySF9clY'
  , client        = {
        real: {
            id     : 'JkzU4zPFJicOSx36Eb7q7FW2hkOCS50m'
          , secret : 'TJKKyCUuPcKsAPbfYYPtCW3fGrlt68ZC'
        }
      , sandbox: {
            id     : 'UkAUNkHNgSunAy2f5BzfuyoUMJXGMcDd'
          , secret : 'RTYrlVKLIN4FsQu51dRaywHK2L8GEJWV'
        }
    }
  , server_conf = {
        production: {
            authorize_url : 'https://betable.com/authorize'
          , betable_host  : 'api.betable.com'
          , betable_port  : 443
          , path_preface  : '/1.0/'
          , http          : require('https')
        }
      , development: {
            authorize_url: 'http://players.dev.betable.com:8081/authorize'
          , betable_host  : '127.0.0.1'
          , betable_port  : 8020
          , path_preface  : '/'
          , http          : require('http')
        }
    }
  , client_id     = client[economy].id
  , client_secret = client[economy].secret
  , callback_url  = 'http://127.0.0.1:8000/callback'
  , authorize_url = server_conf[env].authorize_url
  , betable_host  = server_conf[env].betable_host
  , betable_port  = server_conf[env].betable_port
  , http          = server_conf[env].http
  , path_preface  = server_conf[env].path_preface
  , configuration = {
        symbols  :["Bar","Cherry","Bell","7"]
      , window   :[3,3]
      , paylines :[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]]
    }

server.use( express.bodyParser() )
server.use( express.cookieParser() )
server.use( '/javascript', express.static( __dirname + '/javascript' ))
server.use( '/css',        express.static( __dirname + '/css' ))
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
	
	res.on('header', function() { res.cookie( 'sid', JSON.stringify(req.session) ) })
	next()
})

var httpme = function( request, callback ) {
    var r = http.request( request )
    if( request.body ) r.write( request.body )
	r.on('response', function( result ) {
        var buf = ''
        result.setEncoding('utf8');
        result.on('data', function(chunk){ buf += chunk })
        result.on('end', function(){
            var data = buf
            try { data = JSON.parse( buf ) } catch( e ) {}
            result.body = data;
            callback( result )
        })
    })
    r.on('error', function( error ) { console.log('Connection error', error, request ) })
    r.end()
}


server.get( '/user', function( req, res, next ) {
	if( !req.session.access_token ) {
		req.session.state = Math.floor( Math.random() * 1100000000000 ).toString()
		return res.redirect( authorize_url + '?client_id='+client_id+'&redirect_uri=' + escape( callback_url ) + '&response_type=code&state=' + req.session.state )
	}	
	
	httpme({
	   host   : betable_host, 
	   port   : betable_port, 
	   path   : path_preface + 'account?access_token='+req.session.access_token,
	   method : 'GET'
    }, function( result_account ) {
        if( result_account.statusCode != 200 ) return res.send( result_account.body, result_account.statusCode )
        
        httpme({
            host: betable_host
          , port: betable_port
          , path: path_preface + 'account/wallet?access_token='+req.session.access_token
          , method: 'GET'
        }, function( result_wallet ) {
            return res.render( 'game.html', { 
                first_name    : result_account.body.first_name
              , balance       : result_wallet.body[economy].balance
              , configuration : JSON.stringify(configuration)
            })
        })
    })
		
})

server.post( '/bet', function( req, res, next ) {    
    _.each( req.body.paylines, function( payline, index ) {
        req.body.paylines[ index ] = []
        _.each( payline, function( p ) {
            req.body.paylines[ index ].push( +p )
        })
    })
    
    var body = {
       wager    : req.body.wager
     , currency : 'GBP'
     , economy  : economy
     , paylines : req.body.paylines
    }
    
    httpme({
	   host   : betable_host 
	 , port   : betable_port
	 , path   : path_preface + 'games/' + game_id + '/bet?access_token=' + req.session.access_token
	 , method : 'POST'
     , headers: {
	       'content-type'   : 'application/json; charset=UTF-8'
	     , 'content-length' : JSON.stringify(body).length
	   }
     , body: JSON.stringify(body)
    }, function( response ) {
        return res.send({
            bet_response: response.body
          , bet_body    : body  
        }, response.statusCode )
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
    if( req.query.error ) return res.send( 'we got an error: ' + req.query.error )

	var body = query.stringify({
		grant_type   : 'authorization_code',
		code         : code,
		redirect_uri : callback_url
	})
	httpme({
	   host   : betable_host 
	 , port   : betable_port
	 , path   : path_preface + 'token'
	 , method : 'POST'
	 , headers: {
	       'content-type': 'application/x-www-form-urlencoded'
         , authorization: 'Basic ' + new Buffer( client_id + ':' + client_secret ).toString('base64')
         , 'Content-Length': body.length
	   }
     , body: body
	   
    }, function( result ) {
        if( result.statusCode != 200 ) return res.send( "result is " + result.body )
        req.session.access_token = result.body.access_token
		return res.redirect( '/user' )
    })
})	

server.listen( 8000 )
