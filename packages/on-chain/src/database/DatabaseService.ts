import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@reputable/data-warehouse';
import Database from 'better-sqlite3';
import logger from '../utils/logger.js';
import { Address, Contract, Transactions } from './type.js';

/**
 * This service has two main goals:
 *
 * 1. Maintain a local state with SQLite to optimize memory usage and enhance performance:
 *    - By using SQLite, we can offload storage to the disk, which helps in managing memory more efficiently.
 *    - SQLite provides fast read and write operations, which improves the performance of our application when dealing with a large number of transactions and contract data.
 *
 * 2. Periodically save a checkpoint of the local SQLite state into Prisma:
 *    - This ensures that our application maintains a reliable backup of the local state in a more persistent and scalable database managed by Prisma.
 *    - Checkpoints help in recovering the state in case of application restarts or crashes, ensuring data consistency and reliability.
 *
 * NB: I chose better-sqlite3 because it offers a simple, efficient, and synchronous API for interacting with SQLite databases.
 * It allows for high performance and low overhead database operations, additionally, its synchronous nature simplifies transaction management and ensures data integrity.
 */
export class DatabaseService {
  #prisma: PrismaClient;

  #cronRunId: number;

  #newContractAddedIntoSQLite: boolean = false;

  public internalDatabase: Database.Database;

  public databaseEventEmitter: EventEmitter;

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dbDirectory = path.dirname(dbPath);
    if (!fs.existsSync(dbDirectory)) {
      fs.mkdirSync(dbDirectory, { recursive: true });
    }

    this.internalDatabase = new Database(dbPath);
    this.internalDatabase.pragma('journal_mode = WAL');
    this.#prisma = new PrismaClient();
    this.databaseEventEmitter = new EventEmitter();

    // Bind storeTransactions function to event emitter without async handler
    this.databaseEventEmitter.on(
      'storeTransactions',
      (lastBlockStudied: number, transactions: Transactions) => {
        this.storeLocallyTransactions(lastBlockStudied, transactions).catch(
          (error) => {
            logger.error(
              `[storeLocallyTransactions] Error in storeLocallyTransactions event handler: ${error}`
            );
          }
        );
      }
    );
  }

  async initDatabaseService() {
    // Initialize SQLite local DB if none exists
    this.internalDatabase.exec(`
      CREATE TABLE IF NOT EXISTS contracts (
        address TEXT PRIMARY KEY,
        nbOfTx INTEGER DEFAULT 0,
        totalTve TEXT DEFAULT '0', -- Change type to TEXT
        firstBlockStudied INTEGER DEFAULT 0,
        lastBlockStudied INTEGER DEFAULT 0
      )
    `);

    this.internalDatabase.exec(`
      CREATE TABLE IF NOT EXISTS unique_addresses (
        id INTEGER PRIMARY KEY,
        unique_address TEXT UNIQUE
      )
    `);

    this.internalDatabase.exec(`
      CREATE TABLE IF NOT EXISTS contract_unique_addresses (
        contract_address TEXT,
        unique_address_id INTEGER,
        PRIMARY KEY (contract_address, unique_address_id),
        FOREIGN KEY (contract_address) REFERENCES contracts(address),
        FOREIGN KEY (unique_address_id) REFERENCES unique_addresses(id)
      );
    `);

    const prismaContracts = await this.#prisma.contract.findMany({
      select: { address: true, creationBlockNumber: true },
    });
    // Create a set of contract addresses from Prisma for quick lookup
    const prismaContractsSet = new Set(
      prismaContracts.map((contract) => contract.address.toLowerCase())
    );
    const currentSQLiteContracts = this.getContractAddresses();

    // Determine which contracts to delete from SQLite (those not present in Prisma)
    const contractsToDelete = currentSQLiteContracts.filter(
      (address) => !prismaContractsSet.has(address)
    );

    // Delete contracts from SQLite that are not present in Prisma
    const deleteStmt = this.internalDatabase.prepare(`
    DELETE FROM contracts
    WHERE address = ?
  `);

    this.internalDatabase.transaction(() => {
      for (const address of contractsToDelete) {
        deleteStmt.run(address);
      }
    })();

    // Insert contract addresses into SQLite DB with firstBlockStudied and lastBlockStudied as the creationBlockNumber.
    const insertStmt = this.internalDatabase.prepare(`
      INSERT INTO contracts (address, firstBlockStudied, lastBlockStudied)
      VALUES (?, ?, ?)
      ON CONFLICT(address) DO NOTHING
    `);

    // Insert new contracts into SQLite and track if any new contracts are added
    this.internalDatabase.transaction(() => {
      for (const contract of prismaContracts) {
        const contractAddress = contract.address.toLowerCase();
        const creationBlockNumber = contract.creationBlockNumber;

        if (!currentSQLiteContracts.includes(contractAddress as Address)) {
          insertStmt.run(
            contractAddress,
            creationBlockNumber - 1,
            creationBlockNumber - 1
          );
          this.#newContractAddedIntoSQLite = true;
        }
      }
    })();

    // Create a new cronRun in Prisma
    const cronRun = await this.#prisma.cronRun.create({
      data: {
        cronType: 'onChain',
      },
    });

    // Save the new cronRun ID
    this.#cronRunId = cronRun.id;

    // Logging
    if (this.#newContractAddedIntoSQLite) {
      logger.warn(
        `New contracts were missing in the local SQLite database. It should correspond to new contracts added to prisma.`
      );
    }
    if (contractsToDelete.length > 0) {
      logger.warn(
        `Some contracts have been removed from Prisma DB. Consequently, they have been removed from the SQLite local storage.`
      );
    }
  }

  /**
   * Emit an event to update fetch block state.
   */
  emitDatabaseBackup(lastBlockStudied: number, transactions: Transactions) {
    this.databaseEventEmitter.emit(
      'storeTransactions',
      lastBlockStudied,
      transactions
    );
  }

  async stopDataBaseService({
    lastBlockProcessed,
  }: {
    lastBlockProcessed?: number;
  } = {}) {
    // If lastBlockProcessed is not provided, fetch the last one from the previous cronRun
    if (!lastBlockProcessed) {
      const previousCronRun = await this.#prisma.cronRun.findFirst({
        where: {
          cronType: 'onChain',
        },
        orderBy: {
          finishAt: 'desc', // Get the most recent one
        },
        select: {
          lastBlockProcessed: true,
        },
      });

      if (previousCronRun?.lastBlockProcessed) {
        lastBlockProcessed = previousCronRun.lastBlockProcessed;
      } else {
        // Handle the case where there's no previous cron run or no block was processed before
        lastBlockProcessed = 0;
      }
    }

    // Update the current cron run
    await this.#prisma.cronRun.update({
      where: { id: this.#cronRunId },
      data: {
        cronType: 'onChain',
        finishAt: new Date(),
        lastBlockProcessed: lastBlockProcessed,
      },
    });
  }

  getMinLastBlockStudied(): number | null {
    const stmt = this.internalDatabase.prepare(
      `SELECT MIN(lastBlockStudied) as minLastBlockStudied FROM contracts`
    );
    const row = stmt.get();
    return row ? row.minLastBlockStudied : null;
  }

  private updateLastBlockStudiedForAllContracts(lastBlockStudied: number) {
    const stmt = this.internalDatabase.prepare(`
      UPDATE contracts
      SET lastBlockStudied = ?
    `);

    const transaction = this.internalDatabase.transaction(() => {
      stmt.run(lastBlockStudied);
    });

    transaction();
  }

  async storeLocallyTransactions(
    lastBlockStudied: number,
    transactions: Transactions
  ) {
    // Insert into unique_addresses table (only if unique)
    const insertContractUniqueAddressStmt = this.internalDatabase.prepare(`
      INSERT OR IGNORE INTO unique_addresses (unique_address)
      VALUES (?)
    `);

    // Insert into contract_unique_addresses table, ensuring contract and address exist
    const insertContractUniqueAddressCountStmt = this.internalDatabase.prepare(`
      INSERT OR REPLACE INTO contract_unique_addresses (contract_address, unique_address_id)
      VALUES (?, ?)
    `);

    // Upsert contracts into contracts table
    const stmt = this.internalDatabase.prepare(`
      INSERT INTO contracts (address, nbOfTx, totalTve, firstBlockStudied, lastBlockStudied)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        nbOfTx = excluded.nbOfTx,
        totalTve = excluded.totalTve,
        lastBlockStudied = excluded.lastBlockStudied
    `);

    const contractUpdates: Record<Address, Contract> = {};
    for (const [address, data] of Object.entries(transactions)) {
      if (!contractUpdates[address]) {
        contractUpdates[address] = this.getContract(address as Address);
      }

      const contract: Contract = contractUpdates[address];
      contract.nbOfTx += data.txFromAddresses.size;
      contract.totalTve += Number(data.txTVE);
      contract.firstBlockStudied =
        contract.firstBlockStudied || lastBlockStudied;
      contract.lastBlockStudied = lastBlockStudied;

      for (const addressFrom of data.txFromAddresses) {
        insertContractUniqueAddressStmt.run(addressFrom);
        const { id } = this.internalDatabase
          .prepare('SELECT id FROM unique_addresses WHERE unique_address = ?')
          .get(addressFrom);
        // Insert the relationship between the contract and the unique address
        insertContractUniqueAddressCountStmt.run(address.toLowerCase(), id);
      }

      contractUpdates[address] = contract;
    }

    // Run the transaction to update contracts in the contracts table
    const transaction = this.internalDatabase.transaction(() => {
      for (const address in contractUpdates) {
        const contract = contractUpdates[address];
        stmt.run(
          address,
          contract.nbOfTx,
          contract.totalTve,
          contract.firstBlockStudied,
          contract.lastBlockStudied
        );
      }
    });
    transaction();

    // Update the lastBlockStudy for all contracts in the SQLite DB
    this.updateLastBlockStudiedForAllContracts(lastBlockStudied);
  }

  public getContract(address: Address): Contract | null {
    try {
      const normalizedAddress = address.toLowerCase();
      const stmt = this.internalDatabase.prepare(`
      SELECT * FROM contracts WHERE address = ?
    `);
      const row = stmt.get(normalizedAddress);

      return {
        nbOfTx: row?.nbOfTx || 0,
        totalTve: Number(row?.totalTve) || 0,
        firstBlockStudied: row?.firstBlockStudied || 0,
        lastBlockStudied: row?.lastBlockStudied || 0,
      };
    } catch (error) {
      logger.error(
        `[getContract] Error while getting info for contract (${address}) in SQLite DB: ${error}`
      );
    }
  }

  getContractAddresses(): Address[] {
    const query = 'SELECT address FROM contracts';
    const stmt = this.internalDatabase.prepare(query);
    const rows = stmt.all();
    return rows.map((row: any) => row.address.toLowerCase());
  }

  getContractsToWatch(currentBlockNumber: number) {
    const query = `
      SELECT address 
      FROM contracts 
      WHERE lastBlockStudied < ?`;
    const stmt = this.internalDatabase.prepare(query);
    const rows = stmt.all(currentBlockNumber);
    return rows.map((row: any) => row.address.toLowerCase());
  }

  /**
   * Save the current state from SQLite to Prisma DB.
   */
  //TODO: Be able to save data only for contract data that changed
  async saveStateToPrisma() {
    try {
      logger.info('🚀 Checkpoint reached, Prisma backup triggered');

      const rows = this.internalDatabase
        .prepare(`SELECT * FROM contracts`)
        .all();

      if (!rows || rows.length === 0) {
        throw new Error(
          'No contracts found in the SQLite local database. Cannot save non-existent contracts.'
        );
      }

      // Process each row from SQLite and prepare data for Prisma
      const updateOperations = rows.map((row: any) => {
        // Fetch unique addresses count for the current contract from SQLite
        const uniqueAddressesCountQuery = this.internalDatabase.prepare(`
          SELECT COUNT(*) AS uniqueFromCount
          FROM unique_addresses ua
          INNER JOIN contract_unique_addresses cua ON ua.id = cua.unique_address_id
          WHERE cua.contract_address = ?
        `);
        const { uniqueFromCount } = uniqueAddressesCountQuery.get(row.address);

        // Map SQLite data to Prisma schema fields
        const updateContractOperation = this.#prisma.contract.update({
          where: { address: row.address },
          data: {
            numberOfTx: row.nbOfTx,
            uniqueFromCount: uniqueFromCount,
            tve: Number(row.totalTve),
          },
        });
        return updateContractOperation;
      });
      // Find the minimum lastBlockStudied value
      const minLastBlockStudied = Math.min(
        ...rows.map((row) => Number(row.lastBlockStudied))
      );

      // Add the CronRun update operation to the transaction
      updateOperations.push(
        this.#prisma.cronRun.update({
          where: { id: this.#cronRunId },
          data: {
            cronType: 'onChain',
            finishAt: new Date(),
            lastBlockProcessed: minLastBlockStudied,
          },
        })
      );

      // Execute all operations in a single Prisma transaction
      await this.#prisma.$transaction(updateOperations);
    } catch (error) {
      logger.error(
        `[saveStateToPrisma] Failed to save state to Prisma: ${error}`
      );
    }
  }

  /**
   * Reset the state of each contract in the SQLite database.
   * Keeps the contract entries with empty fields.
   */
  resetInternalDatabase() {
    try {
      // Begin a transaction to ensure atomicity of operations
      this.internalDatabase.transaction(() => {
        // Delete records from contract_unique_addresses table
        const deleteContractUniqueAddressesStmt = this.internalDatabase
          .prepare(`
        DELETE FROM contract_unique_addresses
        WHERE contract_address IN (SELECT address FROM contracts)
      `);
        deleteContractUniqueAddressesStmt.run();

        // Delete records from unique_addresses table
        const deleteUniqueAddressesStmt = this.internalDatabase.prepare(`
        DELETE FROM unique_addresses
        WHERE id NOT IN (SELECT DISTINCT unique_address_id FROM contract_unique_addresses)
      `);
        deleteUniqueAddressesStmt.run();

        // Reset contracts table
        const resetContractsStmt = this.internalDatabase.prepare(`
        UPDATE contracts
        SET nbOfTx = 0,
            totalTve = '0',
            firstBlockStudied = 0,
            lastBlockStudied = 0
      `);
        resetContractsStmt.run();
      })();

      logger.warn('SQLite database has been reset.');
    } catch (error) {
      logger.error(`Error resetting SQLite database: ${error.message}`);
    }
  }

  /**
   * Reset the Prisma Contract schema to default values.
   */
  async resetPrismaContractSchema() {
    try {
      // Reset all contract fields in Prisma to default values
      await this.#prisma.contract.updateMany({
        data: {
          numberOfTx: 0,
          uniqueFromCount: 0,
          tve: 0,
        },
      });

      logger.warn('Prisma contract schema has been reset.');
    } catch (error) {
      logger.error(`Error resetting Prisma contract schema: ${error.message}`);
    }
  }
}
