Github REST API in order to search all smart contract available
https://docs.github.com/fr/rest/search/search?apiVersion=2022-11-28#about-search

Github GraphQL API: https://docs.github.com/fr/graphql/overview/explorer

## `npm run find-repo`

1️⃣ First, you need to generate Prisma types:
```
npm run prisma:generate
```

2️⃣ Then you need a `.env` file containing:
 - `GITHUB_API_TOKEN` -> a Github token with the `repo` scope

To generate a Github token, go to your settings: https://github.com/settings/tokens

-> "Tokens (classic)"

-> "Generate new token"

-> "Generate new token" (classic)

You can leave all scopes unselected.
