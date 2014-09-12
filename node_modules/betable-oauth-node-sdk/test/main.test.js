var should  = require( 'should' )
  , _       = require( 'underscore' )
  , Betable = require( '../index' )
  , assert  = require( 'assert' )
  , qs      = require('querystring')

describe('Betable SDK', function() {
    describe('Initialization', function() {
        it('should create instance if new is omitted', function() {
            var instance = Betable()             

            assert( instance instanceof Betable )
        })
        it('should allow overriding of config defaults', function() {
            var instance = Betable({
                api_base: 'http://example.com'
            })
            
            assert( instance.config.api_base == 'http://example.com' )
        })
        it('should allow adding arbitrary objects to config', function() {
            var instance = Betable({
                foo: 'bar'
            })
            
            assert( instance.config.foo == 'bar' )
        })
    })
    describe('Authorize', function() {
        it('should require a valid node response object', function() {
            var instance = Betable({
                redirectUri: 'http://example.com'
            })
            try {
                instance.authorize()
            } catch( e ) {
                assert( e === 'authorize requires the first parameter to be a valid node response object')
            }
            
            var instance = Betable({
                redirectUri: 'http://example.com'
            })
            try {
                instance.authorize({})
            } catch( e ) {
                assert( e === 'authorize requires the first parameter to be a valid node response object')
            }
        })
        it('should require apiKey to be specified', function() {
            var res = { header: function(){} }
            var instance = Betable({
                redirectUri: 'http://example.com'
            })
            try {
                instance.authorize( res )
            } catch( e ) {
                assert( e == 'Missing api key' )
            }
        })
        it('should require redirectUri to be specified', function() {
            var res = { header: function(){} }
            var instance = Betable({
                apiKey: 'abc123'
            })
            try {
                instance.authorize( res )
            } catch( e ) {
                assert( e == 'Missing redirect uri' )
            }
        })
        it('should set the correct headers', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , redirectUri : 'http://example.com'
            })
            
            var res = {
                headers: {}
              , header: function( name, val ) {
                    res.headers[name] = val    
                }
              , end: function() {
                    assert( res.headers['Content-Type'] == 'text/html' )
                    assert( res.headers['Location'] == instance.config.authorizeUrl + '?' + qs.stringify({
                        client_id     : instance.config.apiKey
                      , redirect_uri  : instance.config.redirectUri
                      , response_type : 'code'
                    }))
                }
            }
            instance.authorize( res )
        })
        it('should add state if passed in', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , redirectUri : 'http://example.com'
            })
            
            var res = {
                headers: {}
              , header: function( name, val ) {
                    res.headers[name] = val    
                }
              , end: function() {
                    assert( res.headers['Content-Type'] == 'text/html' )
                    assert( res.headers['Location'] == instance.config.authorizeUrl + '?' + qs.stringify({
                        client_id     : instance.config.apiKey
                      , redirect_uri  : instance.config.redirectUri
                      , response_type : 'code'
                      , state         : 'foobar'
                    }))
                }
            }
            instance.authorize( res, 'foobar' )
        })
    })
    describe('Access Token', function() {
        it('should require code', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.token(null, function() {
                
                })
            } catch( e ) {
                assert( e == 'You must include a code' )
            }
        })
        it('should require redirect uri', function() {
            var instance = Betable({
                apiKey      : 'abc123'
            })
            try {
                instance.token('abc', function() {
                
                })
            } catch( e ) {
                assert( e == 'Missing redirect uri' )
            }
        })
        it('should require api key', function() {
            var instance = Betable({
                apiSecret: 'abc123'
              , redirectUri: 'http://example.com'
            })
            try {
                instance.token('abc', function() {
                
                })
            } catch( e ) {
                assert( e == 'Missing api key' )
            }
        })
        it('should require api secret', function() {
            var instance = Betable({
                apiKey : 'abc123'
              , redirectUri: 'http://example.com'
            })
            try {
                instance.token('abc', function() {
                
                })
            } catch( e ) {
                assert( e == 'Missing api secret' )
            }
        })
        it('should require valid callback', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.token('abc')
            } catch( e ) {
                assert( e == 'Invalid callback for access token' )
            }
        })
        it('should have a correctly formatted token request', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj ) {
                assert( obj.host == instance.config.apiBase )
                assert( obj.path == instance.config.version + '/token' )
                assert( obj.method == 'POST' )
                
                var body = qs.stringify({
            		grant_type   : 'authorization_code',
            		code         : 'abc',
            		redirect_uri : instance.config.redirectUri
            	})
            	assert( obj.body == body )
                assert( obj.headers['content-type'] == 'application/x-www-form-urlencoded' )
                assert( obj.headers.authorization == 'Basic ' + new Buffer( instance.config.apiKey + ':' + instance.config.apiSecret ).toString('base64'))
                assert( obj.headers['Content-Length'] == body.length )
                done()
            }
            instance.token('abc', function() {
                console.log('hey')
            })
        })
        it('should call callback with error, if one exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( 'Example Error' )
            }
            instance.token('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with error, if one in body exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { error: 'Example Error' } } )
            }
            instance.token('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with access token', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { access_token: 'abc123' } } )
            }
            instance.token('abc', function( error, access_token ) {
                assert( error == null )
                assert( access_token == 'abc123' )
                done()
            })
        })
    })
    describe('Account method', function() {
        it('should require access token', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.account(null, function() {})
            } catch( e ) {
                assert( e == 'Access token is required' )
                done()
            }
        })
        it('should have a correctly formatted account request', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj ) {
                assert( obj.host == instance.config.apiBase )
                assert( obj.path == instance.config.version + '/account?access_token=abc123' )
                assert( obj.method == 'GET' )
                done()
            }
            instance.account('abc123', function() {
                console.log('hey')
            })
        })
        it('should call callback with error, if one exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( 'Example Error' )
            }
            instance.account('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with error, if one in body exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { error: 'Example Error' } } )
            }
            instance.account('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with access token', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { data: 'sup' } } )
            }
            instance.account('abc', function( error, body ) {
                assert( error == null )
                assert( body.data == 'sup' )
                done()
            })
        })
    })
    describe('Wallet method', function() {
        it('should require access token', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.wallet(null, function() {})
            } catch( e ) {
                assert( e == 'Access token is required' )
                done()
            }
        })
        it('should have a correctly formatted account request', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj ) {
                assert( obj.host == instance.config.apiBase )
                assert( obj.path == instance.config.version + '/account/wallet?access_token=abc123' )
                assert( obj.method == 'GET' )
                done()
            }
            instance.wallet('abc123', function() {
                console.log('hey')
            })
        })
        it('should call callback with error, if one exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( 'Example Error' )
            }
            instance.wallet('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with error, if one in body exists', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { error: 'Example Error' } } )
            }
            instance.wallet('abc', function( error ) {
                assert( error == 'Example Error' )
                done()
            })
        })
        it('should call callback with access token', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                callback( null, { body: { data: 'sup' } } )
            }
            instance.wallet('abc', function( error, body ) {
                assert( error == null )
                assert( body.data == 'sup' )
                done()
            })
        })
    })
    describe('Get method', function() {
        it('should validate methods parameter', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.get(null,'abc123',function(){})
            } catch( e ) {
                assert( e == 'Invalid methods')
            }
            try {
                instance.get([],'abc123',function(){})
            } catch( e ) {
                assert( e == 'Invalid methods')
            }
        })
        it('should require access token', function() {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            try {
                instance.get(['hey'],null,function(){})
            } catch( e ) {
                assert( e == 'Access token is required')
            }
        })        
        it('should consolidate responses', function( done ) {
            var instance = Betable({
                apiKey      : 'abc123'
              , apiSecret   : 'foobar'
              , redirectUri : 'http://example.com'
            })
            instance.http = function( obj, callback ) {
                if( obj.path == instance.config.version + '/account/wallet?access_token=abc123' ) {
                    callback( null, { body: { foo: 'bar' } })   
                } else if( obj.path == instance.config.version + '/account?access_token=abc123' ) {
                    callback( null, { body: { foo: 'baz' } })   
                }
            }
            instance.get(['wallet','account'],'abc123', function( error, result ) {
                assert( result.wallet.foo == 'bar' )
                assert( result.account.foo == 'baz' )
                done()
            })
        })
    })
})
