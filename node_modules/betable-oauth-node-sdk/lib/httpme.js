var https = require('https')

module.exports = function( request, callback ) {
    var r = https.request( request )
    if( request.body ) r.write( request.body )
	r.on('response', function( result ) {
        var buf = ''
        result.setEncoding('utf8');
        result.on('data', function(chunk){ buf += chunk })
        result.on('end', function(){
            var data = buf
            try { data = JSON.parse( buf ) } catch( e ) {}
            result.body = data;
            callback( null, result )
        })
    })
    r.on('error', function( error ) { 
        callback( error, null ) 
    })
    r.end()
}