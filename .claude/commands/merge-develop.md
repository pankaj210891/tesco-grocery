# Command: /project:merge-develop

To create new branch based on the changes and merge the code in develop branch.

- create branch based on the changes from develop branch.
- commit, push the changes.

Before merging to develop branch perform below actions.

- Run lint
- Run type-check
- Run build
- Run Cypress tests
- Validate env variables
- Check MongoDB connection
- Verify API routes
- Check responsive layouts

Once all done and we are good to go then merge to develop branch.
