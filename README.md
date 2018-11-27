# DeveloPeer API

Where developers give and receive feedback on their coding projects

### **_[Live link to full stack demo](https://developeer.herokuapp.com/)_**

[![Build Status](https://www.travis-ci.com/fastlain/developeer-api.svg?branch=master)](https://www.travis-ci.com/fastlain/developeer-api)

This repo contains the server-side API built with Node/Express/Mongo(ose). Looking for the front-end DeveloPeer Client? 
**[Click Here](https://github.com/fastlain/developeer-client)**

## Introduction

Feedback is an essential part of any development project. Whether it's identifying bugs, revealing UX issues, or finding typos, constructive criticism can improve your app at any point in the process. But finding reviewers and managing forms can be challenging. DeveloPeer was built to remove these barriers by providing a platform where developers can exchange feedback easily and equitably.

## Technology

### Back End
* [Node](https://nodejs.org/en/) and [Express](https://expressjs.com/)
    * [Passport](http://www.passportjs.org/) authentication (using JWTs)
    * [Mocha](https://mochajs.org/) test framework and [Chai](http://www.chaijs.com/) assertion library
    * [Mongoose](http://mongoosejs.com/) for MongoDB object modeling
* [MongoDB](https://www.mongodb.com/)
    * NoSQL (document-based) database
    * Hosted on the cloud with [mLab](https://mlab.com/)

### Production
* [Travis](https://travis-ci.org/) Continuous Integration
* [Heroku](https://www.heroku.com/) Cloud Application Platform


## Run DeveloPeer API in a local development environment

### Prerequisites
* You will need these programs installed
    * [Git](https://git-scm.com/)
    * [Node.js](https://nodejs.org/en/)
    * [npm](https://www.npmjs.com/)
    * [MongoDB](https://www.mongodb.com/)
  
### Installation
* Clone this repository:
    * `git clone https://github.com/fastlain/developeer-api.git`
* Move into folder:
    * `cd developeer-api/`
* Run `npm install`

### Run Program
* Start MongoDB local server: `mongod`
* Run `npm start` (or `npm run dev` to run with nodemon which auto-restarts on save changes)
* Make requests using the root: `localhost:8080` or your specified port

### Test
* Start MongoDB local server
    * `mongod`
* Run `npm test`


## API Overview

*** Note: all requests to protected endpoints must contain an Authorization header with a valid JWT string:
    
* e.g. using the Fetch API:

    ```
    fetch(PATH, {
        METHOD,
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(BODY)
    }
    ```

### users
* The users endpoint is used to create new users and to obtain user information
* The User model has the following schema:
    ```
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        credit: { type: Number, default: 0 },
        forms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Form', autopopulate: true }],
        reviewsGiven: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
    }
    ```
    * forms is an array of auto-populated Form objects
    * reviewsGiven is an array of ObjectIds referring to Review objects

#### GET /api/users/:id
* Provides the username for a given user id
    * E.g. populate the username of the author of a review (reviews contain reviewer ids, but not usernames)
* The query parameter is simply the requested user id
* Successful response (200) will return the username
* If user id is not found in the database, it will return a 404 response

#### POST /api/users
* Creates a new user

* Valid requests must provide a 'username' and 'password' in the request body
    * Both fields must be strings
    * Neither field may contain leading or trailing whitespace
    * Usernames must be 1-20 characters
    * Passwords must be 10-72 characters
* Invalid requests will result in a 422 response with the following information:
    ```
    {
        code: 422,
        reason: 'ValidationError',
        message: errorMessage,
        location: errorLocation
    }
    ```
* Successful responses (201) will return serialized user data

___

### auth
* The auth endpoint is used to obtain or refresh a JWT (authentication token)

#### POST /api/auth/loginlocal/
* Uses Passport's LocalStrategy to verify username and password
* Request body must provide valid username and password stored in MongoDB
* Successful response (200) will contain a JWT (authentication token) with serialized user data in the payload
* Invalid credentials will result in 401 response

#### POST /api/auth/loginJWT/
* Uses Passport's JwtStrategy to verify the provided JWT
* The request body must provided a valid JWT
* The JWT payload must contain a user object with an id which is verified to be in MongoDB
* Successful response (200) will contain a JWT (authentication token) with serialized user data in the payload
* Invalid credentials will result in 401 response

___

### forms
* The forms endpoint is used to create, read, update, and delete feedback forms
* The Forms model has the following schema:
    ```
    {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        created: { type: Date, default: new Date() },
        projectUrl: { type: String, required: true },
        overview: { type: String, required: true },
        pendingRequests: { type: Number, default: 0 },
        versions: [VersionSchema]
    }
    ```
    * versions is an array of nested Version objects containing different versions of questions associated with the form. Versions have the following schema:
        ```
        {
            questions: [{ type: String }],
            date: { type: Date, default: new Date() }
        }
        ```

#### GET /api/forms/toreview/
* This is a protected endpoint
* Returns a random form to review from the request pool
    * Database query ensures form has pending requests, has not been reviewed by the requesting user, and was not written by the requesting user
* The requesting user is obtained via the JWT (which should contain the user in the payload)
* A successful response (200), will return a form object
* If no forms are found, a 404 response will be sent

#### GET /api/forms/:id/
* Returns the form specified by the id query parameter
* A successful response (200), will return a form object
* If no forms are found, a 404 response will be sent

#### POST /api/forms/
* This is a protected endpoint
* Creates a new form for the requesting user
* If a form is created, the user's 'forms' will be updated
* Requests must contain 'name', 'projectUrl', and 'overview' strings, and 'questions' (an array of strings)
* Invalid requests will return a 422 response with the following information: 
    ```
    {
        code: 422,
        reason: 'ValidationError',
        message: errorMessage,
        location: errorLocation
    }
    ```
* A successful response (201) will return the updated **user** object (with the new form autopopulated)

#### PATCH /api/forms/:id/
* This is a protected endpoint
* Updates the form for the requesting user with the provided fields
* Allowed fields include 'name' (String), 'projectUrl' (String), 'pendingRequests' (Number), 'questions' (Array of Strings), and 'overview' (String)
    * Note that 'id', 'author', and 'created' cannot be changed
* Invalid requests will return a 422 response with the following information: 
    ```
    {
        code: 422,
        reason: 'ValidationError',
        message: errorMessage,
        location: errorLocation
    }
    ```
* If new questions are provided, a new Version will be created and added to the forms 'versions'
* If 'pendingRequests' is changed, the user's credits will be changed accordingly
* A successful response (201) will return the updated **user** object (with the updated form autopopulated)

#### DELETE /api/forms/:id/
* This is a protected endpoint
* Deletes the form specified by the id query parameter
* The request body must contain the form 'id'
* Invalid requests will return a 422 response with the following information: 
    ```
    {
        code: 422,
        reason: 'ValidationError',
        message: 'field missing',
        location: 'id'
    }
    ```
* A successful response (200) will return the updated **user** object (with the deleted form removed)

___

### reviews
* The reviews endpoint is used to create and read reviews (form responses)
* The Forms model has the following schema:
    ```
    {
        formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
        formVersion: { type: mongoose.Schema.Types.ObjectId, required: true },
        responses: [{ type: String }],
        // reviewerId is used if reviewer is a Developeer user
        reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        // reviewerName is used if reviewer is NOT a Developeer user
        reviewerName: { type: String },
        date: { type: Date, default: new Date() }
    }
    ```
#### GET /api/reviews/:id/
* This is a protected endpoint
* Returns the review specified by the id query parameter
* If the review is not found, a 404 response will be sent
* If the review author does not match the requesting user (from the JWT payload), a 401 unauthorized response will be sent
* A successful response (200) will return review object

#### GET /api/reviews/byForm/:formId/
* This is a protected endpoint
* Returns all of the reviews associated with the form matching the formId query parameter
* If the form is not found, a 404 response will be sent
* If the form author does not match the requesting user (from the JWT payload), a 401 unauthorized response will be sent
* A successful response (200) will return an array of review objects

#### POST /api/reviews/
* Creates a new review
* Requests must contain 'formId' (ObjectId), 'formVersion (ObjectId)', 'isInternalReview' (Boolean), 'responses' (an Array of Strings), and EITHER 'reviewerId' (ObjectId) or 'reviewerName' (String)
* If review is external, user 'credits' and form 'pendingRequests' are not affected
* If review is internal, user 'credits' are increased by 1 and form 'pending' requests are decreased by 1
* Invalid requests will return a 422 response with the following information: 
    ```
    {
        code: 422,
        reason: 'ValidationError',
        message: errorMessage,
        location: errorLocation
    }
    ```
* Successful requests will take one of two forms:
    * If reviewerId is provided, the reviewer's user data is updated and the updated **user** object is returned in the 200 response
    * If reviewerId is not provided, a 204 responses is sent 

