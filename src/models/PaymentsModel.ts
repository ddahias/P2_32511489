
import sqlite3 from 'sqlite3';

// Interfaz para los datos de un pago cuando se va a guardar
export interface PaymentData {
    service: string; // Ejemplo: 'Alquiler Bicicleta', 'Alquiler Kayak'
    amount: number;
    payment_status: 'pending' | 'completed' | 'failed'; // Estado del pago
}

// Interfaz para un pago tal como se recupera de la base de datos
export interface Payment extends PaymentData {
    id: number;
    transaction_id?: string; // ID de la transacción del servicio de pago (opcional)
    created_at: string;      // Fecha y hora del registro del pago
}

/**
 * Clase para manejar las operaciones de la base de datos relacionadas con los pagos.
 */
class PaymentsModel {
    private db: sqlite3.Database;

    /**
     * Constructor del modelo de pagos.
     * @param db La instancia de la base de datos SQLite.
     */
    constructor(db: sqlite3.Database) {
        this.db = db;
        this.createTable(); // Asegura que la tabla de pagos exista al iniciar el modelo
    }

    /**
     * Crea la tabla 'payments' en la base de datos si no existe.
     * Incluye columnas para servicio, monto, estado y un ID de transacción opcional.
     */
    createTable(): void {
        const sql = `CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_status TEXT NOT NULL,
            transaction_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`;
        this.db.run(sql, (err: Error | null) => {
            if (err) {
                console.error('ERROR AL CREAR TABLA payments:', err.message);
            } else {
                console.log('Tabla payments lista o ya existía.');
            }
        });
    }

    /**
     * Agrega un nuevo registro de pago a la base de datos.
     * @param paymentData Los datos del pago a agregar.
     * @param callback Una función de callback que se ejecuta al finalizar la operación.
     */
    addPayment(paymentData: PaymentData, callback: (err: Error | null, paymentId?: number) => void): void {
        const sql = `INSERT INTO payments (service, amount, payment_status, created_at)
                     VALUES (?, ?, ?, ?)`;
        const now = new Date().toISOString(); // Obtiene la fecha actual en formato ISO para consistencia

        this.db.run(
            sql,
            [paymentData.service, paymentData.amount, paymentData.payment_status, now],
            function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                    console.error('Error al insertar pago:', err.message);
                    return callback(err);
                }
                callback(null, this.lastID); // Devuelve el ID del nuevo pago
            }
        );
    }
        getAllPayments(callback: (err: Error | null, payments?: Payment[]) => void): void {
        const sql = `SELECT id, service, amount, payment_status, transaction_id, created_at FROM payments ORDER BY created_at DESC`;

        this.db.all(sql, [], (err: Error | null, rows: any[]) => {
            if (err) {
                console.error('Error al obtener pagos:', err.message);
                return callback(err);
            }
            callback(null, rows as Payment[]); // Convierte las filas a objetos Payment
        });
    }

    /**
     * Cierra la conexión a la base de datos (opcional).
     * @param callback Una función de callback que se ejecuta al cerrar la base de datos.
     */
    closeDb(callback?: (err: Error | null) => void): void {
        this.db.close((err: Error | null) => {
            if (err) {
                console.error('Error al cerrar la base de datos de pagos:', err.message);
            } else {
                console.log('Conexión a la base de datos de pagos cerrada.');
            }
            if (callback) {
                callback(err);
            }
        });
    }
}

export default PaymentsModel;
