import { gql, GraphQLClient } from 'graphql-request'

/**
 *
 */
export class EventClient {
  /**
   * Constructor for the EventClient class.
   *
   * @param {object} headers - The headers to be used in the request.
   * @param {string} headers.Authorization - The authorization header.
   */
  constructor (headers = {}) {
    this.client = new GraphQLClient(process.env.EVENT, {
      headers
    })
  }

  /**
   * Fetches the user profile.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async userProfile (req, res, next) {
    const query = gql`
            query User {
                currentUser {
                    avatarUrl
                    email
                    id
                    lastActivityOn
                    name
                    username
                }
            }
        `
    try {
      const accessToken = req.session.accessToken
      this.client.setHeader('Authorization', `Bearer ${accessToken}`)
      const userData = await this.client.request(query)
      const currentUser = userData.currentUser
      // Extracting only the numbers from the id
      const userId = currentUser.id.replace(/\D/g, '') // \D matches any non-digit character, g means global, so it replaces all occurrences
      res.render('login/profile', { user: currentUser, userid: userId })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      next(error)
    }
  }

  /**
   * Fetches the user projects and groups.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async userProject (req, res, next) {
    const query = gql`
            query {
                currentUser {
                    groups(first: 3) {
                        nodes {
                            avatarUrl
                            id
                            name
                            path
                            webUrl
                            fullPath
                            parent {
                                projects(first: 5) {
                                    nodes {
                                        avatarUrl
                                        createdAt
                                        description
                                        fullPath
                                        id
                                        lastActivityAt
                                        name
                                        webUrl
                                        repository {
                                            tree {
                                                lastCommit {
                                                    committedDate
                                                    authorGravatar
                                                    authorName
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `
    try {
      const accessToken = req.session.accessToken
      this.client.setHeader('Authorization', `Bearer ${accessToken}`)
      const userData = await this.client.request(query)
      const groupsData = userData.currentUser.groups
      // Modify the committedDate format for each project's last commit
      groupsData.nodes.forEach(group => {
        group.parent.projects.nodes.forEach(project => {
          if (project && project.repository && project.repository.tree && project.repository.tree.lastCommit) {
            const committedDate = new Date(project.repository.tree.lastCommit.committedDate)
            if (!isNaN(committedDate.getTime())) { // Check if committedDate is a valid date
              const formattedCommittedDate = committedDate.toLocaleString()
              project.repository.tree.lastCommit.committedDate = formattedCommittedDate
            } else {
              console.error('Invalid committedDate:', project.repository.tree.lastCommit.committedDate)
            }
          } else {
            console.error('Missing repository, tree, or lastCommit:', project)
          }
        })
      })
      res.render('login/project', { user: groupsData })
    } catch (error) {
      console.error('Error fetching user projects:', error)
      next(error)
    }
  }

  /**
   * Fetches the user activities.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async userActivity (req, res, next) {
    try {
      const accessToken = req.session.accessToken
      const pageSize = 20// Number of events per page
      const maxEvents = 101 // Maximum number of events to fetch
      let userData = []
      let page = 1
      // Fetch events from GitLab API until reaching the maximum limit
      while (userData.length < maxEvents) {
        const response = await fetch(`https://gitlab.lnu.se/api/v4/events?per_page=${pageSize}&page=${page}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        })
        const events = await response.json()
        if (events.length === 0) break // No more events to fetch
        userData = userData.concat(events)
        page++
      }
      // Slice the userData array to the maximum limit
      userData = userData.slice(0, maxEvents)
      // Calculate total number of events and total pages
      const totalEvents = userData.length
      const totalPages = Math.ceil(totalEvents / pageSize)
      // Ensure page is within valid range
      page = Math.min(Math.max(1, req.query.page || 1), totalPages)

      // Calculate start and end indices for pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = Math.min(startIndex + pageSize, totalEvents)
      // Extract required fields for each event and paginate
      const paginatedData = userData.slice(startIndex, endIndex).map(event => {
      // Extract date and time from the created_at field
        const date = new Date(event.created_at)
        const formattedDate = date.toLocaleString()// Adjust this according to your preferred date format
        // Return object with required fields
        return {
          target_type: event.target_type,
          action_name: event.action_name,
          created_at: formattedDate,
          target_title: event.target_title
        }
      })
      res.render('login/activities', {
        user: paginatedData,
        totalPages,
        currentPage: page
      })
    } catch (error) {
      console.error('Error fetching user activities:', error)
      next(error)
    }
  }

  /**
   * Logs out the user.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async logout (req, res, next) {
    try {
      const TOKEN = req.session.accessToken
      if (TOKEN) {
        req.session.destroy((err) => {
          if (err) {
            return next(err)
          }
          res.clearCookie(process.env.SESSION_NAME)
          res.redirect('/')
        })
      }
    } catch (error) {
      console.error('Error logging out:', error)
      next(error)
    }
  }
}
