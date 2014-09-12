var _     = require('underscore')
  , qs    = require('querystring')
  , http  = require('./httpme')
  , async = require('async')

var Betable = module.exports = function( config_obj ) {
    if( !( this instanceof Betable ) ) return new Betable( config_obj )
    
    var config = {
        apiBase       : 'api.betable.com'
      , authorizeUrl  : 'https://www.betable.com/authorize'
      , version       : '/1.0'
    }
        
    this.config = _.extend( config, config_obj )
    this.http   = http
}

Betable.prototype.authorize = function( res, state ) {   
    if( typeof res !== 'object' 
     || typeof res.header !== 'function' ) throw 'authorize requires the first parameter to be a valid node response object'
    if( !this.config.apiKey )              throw 'Missing api key'
    if( !this.config.redirectUri )         throw 'Missing redirect uri'
    
    var query = {
        client_id     : this.config.apiKey 
      , redirect_uri  : this.config.redirectUri
      , response_type : 'code'
    }
    if( state ) query.state = state
    
    res.header('Content-Type', 'text/html')
    res.statusCode = 302
    res.header('Location', this.config.authorizeUrl + '?' + qs.stringify( query ) )
    res.end('Redirecting...')
}

Betable.prototype.token = function( code, callback ) {
	if( !code )                          throw 'You must include a code'
	if( !this.config.redirectUri )       throw 'Missing redirect uri'
	if( !this.config.apiKey )            throw 'Missing api key'
	if( !this.config.apiSecret )         throw 'Missing api secret'
	if( typeof callback !== 'function' ) throw 'Invalid callback for access token'
	
	var body = qs.stringify({
		grant_type   : 'authorization_code',
		code         : code,
		redirect_uri : this.config.redirectUri
	})
	this.http({
	   host   : this.config.apiBase
	 , path   : this.config.version + '/token'
	 , method : 'POST'
	 , headers: {
	       'content-type'   : 'application/x-www-form-urlencoded'
         , authorization    : 'Basic ' + new Buffer( this.config.apiKey + ':' + this.config.apiSecret ).toString('base64')
         , 'Content-Length' : body.length
	   }
     , body: body
	   
    }, function( error, result ) {
        if( error )             return callback( error )
        if( result.body.error ) return callback( result.body.error )
        return callback( null, result.body.access_token )
    })
}

Betable.prototype.account = function( accessToken, callback ) {
    if( !accessToken ) throw 'Access token is required'
    
    this.http({
	   host   : this.config.apiBase
	 , path   : this.config.version + '/account?access_token=' + accessToken
	 , method : 'GET'	   
    }, function( error, result ) {
        if( error )             return callback( error )
        if( result.body.error ) return callback( result.body.error )
        return callback( null, result.body )
    })
}

Betable.prototype.wallet = function( accessToken, callback ) {
    if( !accessToken ) throw 'Access token is required'
    
    this.http({
	   host   : this.config.apiBase
	 , path   : this.config.version + '/account/wallet?access_token=' + accessToken
	 , method : 'GET'	   
    }, function( error, result ) {
        if( error )             return callback( error )
        if( result.body.error ) return callback( result.body.error )
        return callback( null, result.body )
    })
}

Betable.prototype.get = function( methods, access_token, callback ) {
    if( typeof methods !== 'object' 
        || !methods
        || !methods.length ) throw 'Invalid methods'
    if( !access_token )      throw 'Access token is required'
    
    var self = this
    
    var async_methods = _.map( methods, function( method ) {
        return function( method_callback ) {
            Betable.prototype[method].call( self, access_token, method_callback )
        }
    })
    
    async.parallel( async_methods, function( error, data ) {
        if( error ) return callback( error )
        
        callback( null, _.reduce( data, function( res, method, index ) {
            res[methods[index]] = method
            return res
        }, {}) )
    })
}