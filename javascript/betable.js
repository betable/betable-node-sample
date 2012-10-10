;(function( $, Raphael, _ ) {
    var BetableSlot = function() {}
    
    BetableSlot.prototype.get_random_symbol = function() {
        var index = Math.floor( Math.random() * this.config.symbols.length )
        return this.config.symbols[ index ]
    }
    
    BetableSlot.prototype.init = function( config, access_token ) {
        this.config = config.configuration
        
        var self = this
        
        this.reel_list = $('#window') 
        this.paper     = Raphael( 0, this.reel_list.position().top, this.reel_list.width(), this.config.window[1]*25 )
        this.paylines  = _.map( this.config.paylines, function( payline ) { return new Payline( payline )})
        this.reels     = _.map( _.range( this.config.window[0] ), function( iterator ) {
            return new Reel( _.map( _.range(self.config.window[1]), function( height_iterator ) {
                return self.get_random_symbol()
            }))
        })
        
        this.sdk          = new Betable( config.game_id, access_token )
        this.economy      = config.economy
        this.mode         = config.mode
        this.game_id      = config.game_id
        this.access_token = access_token
        
        this.paylines[0].show()
        
        $('#bet')         .click(function() { self.bet.call( self ) })
        $('#lines')       .delegate('.type', 'click', function( e ) { self.change_payline.call( self, e ) })
        $('#wager-input') .on('keyup', this.update_bet_amount )
    }
    
    BetableSlot.prototype.bet = function() {
        var self = this
        _.each( this.reels, function( reel ) { reel.spin() })
        
        if ( self.mode == 'unbacked' ) {
          var bet_obj = {
              paylines : _.map( _.filter( self.paylines, function( payline ) {
                  payline.reset()
                  return $('#' + payline.id ).is(':visible')
              }), function( payline ) {
                  return payline.payline
              })
            , wager    : $('#wager-input').val()
          }
        }
        else {
          var bet_obj = {
              currency : 'GBP'
            , economy  : self.economy
            , paylines : _.map( _.filter( self.paylines, function( payline ) {
                  payline.reset()
                  return $('#' + payline.id ).is(':visible')
              }), function( payline ) {
                  return payline.payline
              })
            , wager    : $('#wager-input').val()
          }         
        }
        
        var bet_response = function( data, xhr ) { 
            var num_reels   = data.window[0].length
              , paylines_id = {}
            
            data.reels = []
            _.each( _.range( num_reels ), function( reel_index ) {
                _.each( _.range( data.window.length ), function( symbol_index ) {
                    if( !data.reels[ reel_index ] ) data.reels[ reel_index ] = []
                    data.reels[ reel_index ].push( data.window[ symbol_index ][ reel_index ] )
                })
            })
            
            _.each( self.reels, function( reel, reel_index ) {
                setTimeout(function() {
                    reel.resolve( data.reels[ reel_index ] )
                }, reel_index * 500 )
            })
            
            _.each( self.paylines, function( payline ) {
                paylines_id[ payline.id ] = payline
            })

            setTimeout(function() {
                $('#win').html( data.payout )
                $('#balance').html( (Number($('#balance').text()) + Number(data.payout) -( Number($('#wager-input').val()) * bet_obj.paylines.length )).toFixed(2) )
                 _.each( data.outcomes, function( outcome ) {
                    if( outcome.outcome == "win" ) {
                        paylines_id[ 'payline-' + outcome.payline.join('-') ].set_win( outcome.payout )
                    }
                })
                self.print_response( xhr, bet_obj )
            }, (self.reels.length-1) * 500 )
        }
        
        this.sdk.canIGamble( function( response ) {
            if( self.economy == "sandbox" ) response.can_gamble = true
            if( response && response.can_gamble) {
              if ( self.mode == 'unbacked' ) {
                self.sdk.unbackedBet( bet_obj, bet_response, function( error ) {
                    console.log( 'error', error )
                    //handle error
                })
              } else {
                  self.sdk.bet( bet_obj, bet_response, function( error ) {
                      console.log( 'error', error )
                      //handle error
                }) 
              }
            } else {
                //cannot gamble, display virtual currency
                console.log('This user cannot gamble')
            }
        }, function( error ) {
            //perform error
            console.log('An error has occured', error)
        })
    }

    BetableSlot.prototype.update_bet_amount = function() {
        $('#total-bet-amount').text( (+$('#payline-amount').text() * +$('#wager-input').val()).toFixed(2) )
    }
    
    BetableSlot.prototype.change_payline = function( e ) {
        var selected_paylines = Number( $('#payline-amount').text() )
        switch( $(e.currentTarget).attr('id') ) {
            case 'payline-add':
                if( selected_paylines < this.paylines.length ) {
                    this.paylines[ selected_paylines ].show()
                    $('#payline-amount').text( ++selected_paylines )
                    $('#total-bet-amount').text( (selected_paylines * +$('#wager-input').val()).toFixed(2) )
                }
                break
            case 'payline-dec':
                if( selected_paylines > 1 ) {
                    this.paylines[ --selected_paylines ].hide()
                    $('#payline-amount').text( selected_paylines )
                    $('#total-bet-amount').text( (selected_paylines * +$('#wager-input').val()).toFixed(2) )
                }
                break
        }
    }
    
    BetableSlot.prototype.print_response = function( response, request_body ) {
        if (this.mode == "unbacked") {
          var res = ['POST /1.0/games/'+this.game_id+'/unbacked-bet?access_token='+this.access_token
                  , 'Content-Type: application/json; charset=utf-8']
          } else {
          var res = ['POST /1.0/games/'+this.game_id+'/bet?access_token='+this.access_token
                  , 'Content-Type: application/json; charset=utf-8']
          }
        res = res.concat( JSON.stringify(request_body,undefined,4).split('\n'))
        
        $('#bet-request').html(_.reduce(res, function(text, line) { return text + '> ' + line + '\n' }, ''))
        
        res = ['HTTP/1.1 ' + response.status + ' ' + response.statusText]
        res = res.concat( response.getAllResponseHeaders().split('\n') )
        res = res.concat( JSON.stringify(JSON.parse(response.responseText),undefined,4).split('\n') )
        
        $('#bet-request').html(_.reduce(res, function(text, line) { return text + '< ' + line + '\n' }, $('#bet-request').html()))
    }
    
    window.BetableSlot = new BetableSlot()
})( window.jQuery, window.Raphael, _ );