import sqlite3 from 'sqlite3';

export interface ContactData { 
    name: string;
    email: string;
    comment: string;
    ip_address?: string; 
}

export interface Contact extends ContactData { 
    id: number;
    created_at: string;
}

class ContactsModel { 
    private db: sqlite3.Database; 

    constructor(db: sqlite3.Database) {
        this.db = db;
        this.createTable();
    }

    createTable(): void {
        const sql = `CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            comment TEXT,
            ip_address TEXT,
            created_at TEXT
        )`;
        this.db.run(sql, (err: Error | null) => {
            if (err) {
                console.error('CALLBACK CREATE TABLE - ERROR:', err.message); 
            } else {
                console.log('CALLBACK CREATE TABLE - ÉXITO: Tabla contacts lista o ya existía.'); 
            }
        });
    }

    addContact(contactData: ContactData, callback: (err: Error | null, contactId?: number) => void): void {
        const sql = `INSERT INTO contacts (name, email, comment, ip_address, created_at)
                     VALUES (?, ?, ?, ?, ?)`;
        const now = new Date().toISOString(); 
        console.log('contacto guardado');
        this.db.run(
            sql,
            [contactData.name, contactData.email, contactData.comment, contactData.ip_address || null, now], 
            function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    console.error('Error al ejecutar INSERT:', err.message);
                    return callback(err);
                }
                callback(null, this.lastID);
            }
        );
    }

    getAllContacts(callback: (err: Error | null, contacts?: Contact[]) => void): void {
        const sql = `SELECT id, name, email, comment, ip_address, created_at FROM contacts ORDER BY created_at DESC`;

        this.db.all(sql, [], (err: Error | null, rows: any[]) => { 
            if (err) {
                console.error('Error al ejecutar SELECT:', err.message);
                return callback(err);
            }
            callback(null, rows as Contact[]);
        });
    }

    closeDb(callback?: (err: Error | null) => void): void {
        this.db.close((err: Error | null) => {
            if (err) {
                console.error('Error al cerrar la base de datos:', err.message);
            } else {
                console.log('Conexión a la base de datos cerrada.');
            }
            if (callback) {
                callback(err);
            }
        });
    }
}

export default ContactsModel;