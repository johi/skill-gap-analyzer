import { db } from '../db';

export type Database = typeof db;

// Derive the transaction object type from the callback
// accepted by db.transaction().
export type Transaction = Parameters<
    Parameters<Database['transaction']>[0]
>[0];

export type DatabaseExecutor = Database | Transaction;