import sqlite3 from 'sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/authUtils';

dotenv.config();

const sqlite = sqlite3.verbose();

const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password_hash TEXT,
                google_id TEXT UNIQUE, -- Nueva columna para el ID de Google
                email TEXT UNIQUE,     -- Nueva columna para el email de Google (puede ser null para usuarios locales)
                is_admin INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `, (createTableErr) => {
            if (createTableErr) {
                console.error('Error al crear la tabla users:', createTableErr.message);
            } else {
                console.log('Tabla users verificada/creada.');

                // Lógica para crear el usuario administrador inicial si no existe ninguno
                db.get("SELECT COUNT(*) AS count FROM users WHERE is_admin = 1", (countErr, row: { count: number }) => {
                    if (countErr) {
                        console.error("Error al verificar si existe un administrador:", countErr.message);
                        return;
                    }
                    if (row.count === 0) {
                        const adminUsername = process.env.ADMIN_USERNAME || 'administradora';
                        const adminPassword = process.env.ADMIN_PASSWORD || 'contrasena123';

                        hashPassword(adminPassword).then(hashedPwd => {
                            
                    db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)', [adminUsername, hashedPwd], function(this: sqlite3.RunResult, insertErr: Error | null) {
                        if (insertErr) {
                         console.error('Error al insertar usuario administrador inicial:', insertErr.message);                            
                    } else {
                            console.log(`Usuario administrador inicial "${adminUsername}" creado con éxito.`);
                            console.log(`¡ATENCIÓN! Cambia la contraseña de 'admin' inmediatamente o usa variables de entorno para ADMIN_USERNAME y ADMIN_PASSWORD.`);                            }
                        });
                }).catch(hashErr => {
                            console.error('Error al hashear contraseña del admin inicial:', hashErr);
                        });
                    }
                });
            }
        });
    }
});

export default db;
