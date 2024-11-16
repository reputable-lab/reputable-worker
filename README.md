# Reputable

The project is a monorepo

## Set up project

1. Use the appropriate node version (Node v20)

```sh
nvm use
```

2. Install the dependencies

```sh
npm ci
```

3. Run this command and complete the `.env.dev`& `.env.prod`created files

```sh
cp .env.template .env.dev && cp .env.template .env.prod
```

## Services

### Data-Warehouse Service

The Data-Warehouse Service is responsible for creating and seeding the database. It ensures that the necessary structure is in place and populates initial data, providing a foundational setup for other services.

### API Service

The API Service provides access to the data stored in the Prisma database managed by the Data-Warehouse Service. It acts as a gateway for retrieving information from the database, enabling seamless integration and interaction with the stored data.

### Data Collection Services

These services are dedicated to collecting and enriching data for the database:

- Off-Chain Service: Gathers data about developers from off-chain sources, primarily focusing on GitHub profiles and related information.

- On-Chain Service: Collects on-chain data pertaining to smart contracts developed within the ecosystem.

- Reputation Model Service: Utilizes the accumulated off-chain and on-chain data to calculate and assign a reputation score to developers. This score serves as a quantitative measure based on their contributions and activities.

## Start running all services

### For Dev mode

At the root directory, execute the following command :

```sh
npm run start:dev
```

Now you got to sleep 🙂

### For Prod mode

```sh
npm run start-all:prod
```

Now you got to sleep 🙂

## Start running one service

### For Dev mode

Go through the service that you want to run using `cd ...` and run the following command :

```sh
npm run start:dev
```

### For Prod mode

Go through the service that you want to run using `cd ...` and run the following command :

```sh
npm run start:prod
```

---

# TODO

### Data-Warehouse

- [ ] recursive algo check answer made on the PR

### On-chain

- [ ] Implement onchain jest unit test, i will easier in the future to check that all works as expected. Add CI with github action

### reputation-model

- [ ] Set jest unit tests.
