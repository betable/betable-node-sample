;(function( $, _ ) {
    var Reel = function( reel ) {
        if( !( this instanceof Reel ) ) {
            return new Reel( reel )
        }
        this.reel = reel
        this.id   = 'reel-' + (+$('#window').children('.reel').length+1)
        this.show()
    }

    Reel.prototype.show = function() {
        var reel_div = $('#'+this.id)
          , exists   = reel_div.length > 0
        
        if (!exists) {
            reel_div =  $('<div class="reel" id="'+this.id+'" />')
        }
        reel_div.empty()
        
        var reel_ul  = $('<ul />').appendTo( reel_div )
        
        _.each( this.reel, function( symbol ) {
            reel_ul.append( $('<li>'+symbol+'</li>'))
        })
        
        if( !exists ) $('#window').append( reel_div )
    }
    Reel.prototype.spin = function() {
        var self = this
        this.spinning = setInterval(function() {
            self.draw_spin()
        }, 100 )
    }
    Reel.prototype.draw_spin = function() {
        _.each( $('#'+this.id + ' ul li'), function( li ) {
            $(li).text( Betable.get_random_symbol() )
        })
    }
    Reel.prototype.resolve = function( reel ) {
        clearInterval( this.spinning )
        this.reel = reel
        this.show()
    }
    window.Reel = Reel
})( window.jQuery, _ )