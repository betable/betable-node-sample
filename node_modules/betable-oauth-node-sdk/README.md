Betable OAuth Node SDK
=====================

Before bets may be placed through the Betable API, the client must be authorized by the player using OAuth.

The Betable OAuth Node SDK (like the other Betable OAuth SDKs) redirects the player to <https://betable.com/authorize> and when they return, completes the OAuth protocol to produce an access token.

Usage
-----

**Configure the Betable OAuth Node SDK**:

    var betable = require('betable-oauth-node-sdk')({
        apiKey      : 'YOUR_CLIENT_ID'
      , apiSecret   : 'YOUR_CLIENT_SECRET'
      , redirectUri : 'YOUR_REDIRECT_URI'
    })

**Redirect the player to Betable**:

    betable.authorize(res, state)

`state` is optional but recommended.  Provide a string you plan to use below to ensure the player who begins the OAuth protocol is the same one that is redirected back in the next step. When the player is redirected back, we will provide the same `state` that you passed in so you can verify that they match.

**When the player is redirected back to your redirect URI, complete the OAuth protocol to produce an access token**:

    if (req.query.code && req.session.state === req.query.state) {
        Betable.token(req.query.code, function(error, accessToken) {
            if (error) {
                return res.send(error, 400)
            }
            // Use accessToken.
        })
    }

**Configure the [Betable Browser SDK](https://github.com/betable/betable-browser-sdk)**:

    <script src="betable-browser-sdk.js"></script>
    <script>
    var accessToken = '{{accessToken}}';
    </script>

**Get the player's account, which includes their first and last name**:

    Betable.account(accessToken, function(response) {
    //
    // response:
    //
    //     {
    //         "id": "A4n7V5UL3gKx8ms2"
    //       , "first_name": "Charles"
    //       , "last_name": "Fey"
    //    }
    //
    })

**Get the player's wallet, which includes their real-money balance**:

    Betable.wallet(accessToken, function(response) {
    //
    // response:
    //
    //     {
    //       , "real": {
    //             "balance": "0.00"
    //           , "currency": "GBP"
    //           , "economy": "real"
    //         }
    //       , "sandbox": {
    //             "balance": "0.00"
    //           , "currency": "GBP"
    //           , "economy": "sandbox"
    //         }
    //     }
    //
    })

Full documentation may be found at <https://developers.betable.com/docs/>.

Example
-------

<https://github.com/betable/betable-oauth-node-sdk/blob/master/test.js>