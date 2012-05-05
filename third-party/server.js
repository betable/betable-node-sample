var express = require( 'express' )
  , server  = express.createServer()
  , http    = require( 'http' )
  , query   = require( 'querystring' )

var economy       = 'sandbox'
  , client_id     = '2GeGzIMPI4oxfeDZyRcRHldKFMcUjECF'
  , client_secret = '6MhMlTgsTxSEst695PB7VcLbd8CtSBNd'
  , game_id       = '6ev92ATTgWgn3Yuy0kk6gE'
  , betable_host  = '10.0.1.5'
  , betable_port  = 8020
  , paylines = [
        [1,1,1]
      , [2,2,2]
      , [3,3,3]
      , [1,2,3]
      , [3,2,1]
    ]

var contains = function(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true
       }
    }
    return false
}

String.prototype.repeat = function(num) { return new Array(num + 1).join(this) }

server.use( express.bodyParser() )
server.use( express.cookieParser() )
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
		// The user is not logged in. Do that by redirecting
		// to Betable authorization endpoint with /callback
		// as the callback.
		req.session.state = Math.floor( Math.random() * 1100000000000 ).toString()
		return res.redirect( 'http://players.dev.betable.com:8081/authorize?client_id='+client_id+'&redirect_uri=' + escape('http://127.0.0.1:8000/callback') + '&response_type=code&state=' + req.session.state )
	}	
	// Get the user object from betable API and display it
	httpme({
	   host   : betable_host, 
	   port   : betable_port, 
	   path   : '/account?access_token='+req.session.access_token,
	   method : 'GET'
    }, function( result_account ) {
        if( result_account.statusCode != 200 ) return res.send( result_account.body, result_account.statusCode )
        
        httpme({
            host: betable_host
          , port: betable_port
          , path: '/account/wallet?access_token='+req.session.access_token
          , method: 'GET'
        }, function( result_wallet ) {
            var body = {
                account: result_account.body
              , wallet : result_wallet.body
            }
            
            function arrays_equal(a,b) { return !(a<b || b<a); }
            
            if( req.query.paylines ) {
            req.query.paylines = JSON.parse(req.query.paylines)
            for( l in req.query.paylines ) {
                //console.log( 'hey', req.query.paylines[l] )
            }
            }
            //req.query.paylines = JSON.parse(req.query.paylines||{})
            
            var response = 'hello ' + body.account.first_name + ' your balance is ' + body.wallet[economy].balance + '<form action="/bet" method="POST"><br />Choose your paylines:<br />'
            for( i in paylines ) {
                for( l in req.query.paylines ) {
                    console.log( arrays_equal(req.query.paylines[l], paylines[i] ) )
                }
                
                
                response += '<input type="checkbox" name="paylines" value="'+JSON.stringify(paylines[i])+'" />'+paylines[i].join(', ') +'<br />'
            }
            response+='<input type="submit" value="BET!" /></form>'
            
            
            if( req.query && req.query.outcome && req.query.payout ) {
                //response = 'You won $' + req.query.payout + '!'.repeat(req.query.payout) + '<br/>' + response
                var outcome = JSON.parse( req.query.outcome )
                for( i in outcome ) {
                    response = response + outcome[ i ] + '<br />'
                }
                response = 'You won $' + req.query.payout + '<br/>' + response
            }
            console.log( body )
            res.send( response )
        })
    })
		
})

server.post( '/bet', function( req, res, next ) {
    
    var payl = []
    if( typeof req.body.paylines != 'object' ) req.body.paylines = [ req.body.paylines ]
    for( p in req.body.paylines ) {
        payl.push( JSON.parse( req.body.paylines[p] ) )
    }
    
    var r = http.request({
	   host   : betable_host 
	 , port   : betable_port
	 , path   : '/game/'+game_id+'/bet?access_token='+req.session.access_token
	 , method : 'POST'
     , headers: {
	       'content-type': 'application/json; charset=UTF-8'
	   }
    })
    var body = {
       wager: '1.00'
     , currency: 'GBP'
     , economy: economy
     , location: {
           latitude: 0
         , longitude: 0
       }
     , paylines: payl
   }
    
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
            
            //return console.log( JSON.stringify( response.body ))
            
            res.redirect( '/user?outcome=' + JSON.stringify(response.body.window) + '&payout=' + response.body.payout + '&paylines=' + JSON.stringify(req.body.paylines) )
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

	var r = http.request({
	   host:betable_host
     , port:betable_port
     , path: '/token'
     , method: 'POST'
     , headers: {
		'content-type': 'application/x-www-form-urlencoded',
		authorization: 'Basic ' + new Buffer( client_id + ':' + client_secret ).toString('base64')
	}})
	//console.log( 'about to write data' )
	r.write(query.stringify({
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: 'http://127.0.0.1:8000/callback'
	}))
	//console.log( 'about to response' )
	r.on('response', function( result ) {
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
	//console.log( 'about to end' )
	r.end()

})	

server.listen( 8000 )
