;(function( $, _ ) {
    var Payline = function( payline ) {
        if( !( this instanceof Payline ) ) return new Payline( payline )

        this.payline        = payline
        this.id             = 'payline-' + this.payline.join('-')
        this.payline_colors = ['#E01B6A', '#1BE0C9', '#1B22E0', '#E0741B', '#8B1BE0', '#33451C' ]
    }
    Payline.prototype.show = function() {
        var payline_li = $('#' + this.id)
        if (!payline_li.length) {
            payline_li = $('<li id="'+this.id+'">' + this.payline.join(',') + '</li>')
            $('#paylines').append(payline_li)
        }
        var self = this
        
        var on_hover = function() {
            self.line.attr('stroke-width', 2 )
            self.line.attr('opacity', 1 )
        }
        var off_hover = function() {
            if( !self.is_winner ) {
                self.line.attr('stroke-width', 1 )
                self.line.attr('opacity', 0.3 )
            }
        }
        
        payline_li.show().hover( on_hover, off_hover )
        
        if( !this.line ) {
            var path = ''
              , payline = this.payline
            _.each( $('#window').find('ul'), function( reel, it ) {
                var el = $(reel).find('li:nth-child('+(payline[it]+1)+')')
                  , pos = el.position()
                  , ht  = el.height()
                  , wt  = el.width()
                  
                pos.top -= $('#window').position().top
                  
                path += ( path == '' ) ? 'M' : 'L'
                path += (pos.left + (wt/2)) + ',' + (pos.top + (ht/2))
            })
            
            this.line = BetableSlot.paper.path( path )
            this.line.attr('stroke', this.payline_colors.pop() )
            this.line.attr('opacity', 0.3 )
            this.line.hover( on_hover, off_hover )
        } else {
            this.line.show()
        }
    }
    Payline.prototype.hide = function() {
        $('#' + this.id).hide()
        this.line.hide()
    }
    Payline.prototype.set_win = function( amount ) {
        $('#' + this.id).css({'font-weight': 'bold'}).append( '<span>' + amount + '</span>' )
        this.line.attr('stroke-width', 2 )
        this.line.attr('opacity', 1 )
        this.is_winner = true
    }
    Payline.prototype.reset = function() {
        $('#' + this.id).find('span').remove()
        $('#' + this.id).css({'font-weight': 'normal'})
        if( this.line ) {
            this.line.attr('stroke-width', 1 )
            this.line.attr('opacity', 0.3 )
        }
        this.is_winner = false
    }
    window.Payline = Payline
})( window.jQuery, _ )