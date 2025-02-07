import crypto from 'crypto'

/**
 *
 */
export class UserController {
  /**
   * Renders a view and sends the rendered HTML string as an HTTP response.
   * index GET.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async index (req, res, next) {
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    req.session.state = state
    const hashedVerifier = crypto.createHash('sha256').update(process.env.CODE_VERIFIER).digest('base64')
    // Encoding the hashed verifier to URL-safe base64
    const CODE_CHALLANGE = hashedVerifier.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const response = `https://gitlab.lnu.se/oauth/authorize?client_id=${process.env.APP_ID2}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&state=${state}&scope=${process.env.REQUESTED_SCOPES}&code_challenge=${CODE_CHALLANGE}&code_challenge_method=S256`
    res.redirect(response)
  }

  /**
   * Handles the callback from the OAuth provider.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async handleCallback (req, res, next) {
    try {
      const state = req.query.state
      const RETURNED_CODE = req.query.code
      // Check if the state matches
      if (state !== req.query.state) {
        throw new Error('State mismatch. Possible CSRF attack.')
      }
      const tokenResponse = await fetch('https://gitlab.lnu.se/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.APP_ID2,
          client_secret: process.env.CLIENT_SECRET2,
          code: RETURNED_CODE,
          grant_type: 'authorization_code',
          redirect_uri: process.env.REDIRECT_URI,
          code_verifier: process.env.CODE_VERIFIER
        })
      })
      const tokenData = await tokenResponse.json()
      // Store the access token in the session
      req.session.accessToken = tokenData.access_token
      req.session.userLoggedIn = !!tokenData.access_token
      res.redirect('/')
    } catch (error) {
    // Handle errors during authentication
      next(error)
    }
  }
}
