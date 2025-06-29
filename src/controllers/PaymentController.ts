import { Request, Response } from 'express';
import axios from 'axios';
import PaymentsModel, { PaymentData, Payment } from '../models/PaymentsModel'; // Importa el modelo de pagos

const FAKE_PAYMENT_API_URL = process.env.FAKE_PAYMENT_API_URL || 'https://fakepayment.onrender.com';
const FAKE_PAYMENT_API_KEY = process.env.FAKE_PAYMENT_API_KEY || 'YOUR_FAKE_PAYMENT_API_KEY'; // Asegúrate de tener esto en tu .env

interface PaymentAPIResponse {
    success: boolean;
    message?: string;
    [key: string]: any; // Para capturar otras propiedades de la respuesta de la API
}

class PaymentController {
    private paymentsModel: PaymentsModel; // Añade una propiedad para el modelo de pagos

    constructor(paymentsModel: PaymentsModel) {
        this.paymentsModel = paymentsModel; // Inicializa el modelo de pagos
        this.processPayment = this.processPayment.bind(this);
        this.showPaymentForm = this.showPaymentForm.bind(this);
        this.index = this.index.bind(this); // Nuevo método para la tabla de pagos
    }

    public async processPayment(req: Request, res: Response): Promise<void> {
        const { monto, moneda, email, nombre_titular, numero_tarjeta, exp_mes, exp_anio, cvv, servicio } = req.body;

        // Validación básica
        if (!monto || !moneda || !email || !nombre_titular || !numero_tarjeta || !exp_mes || !exp_anio || !cvv || !servicio) {
            console.log('[PaymentController] Faltan campos requeridos:', req.body);
            req.flash('error', 'Por favor, completa todos los campos requeridos para el pago.');
            return res.redirect('/pago');
        }

        const parsedAmount = parseFloat(monto);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.log('[PaymentController] Monto inválido:', monto);
            req.flash('error', 'El monto del pago es inválido.');
            return res.redirect('/pago');
        }

        // Convierte el año a formato completo si tiene solo 2 dígitos
        let expirationYear = exp_anio;
        if (expirationYear.length === 2) {
            expirationYear = '20' + expirationYear;
        }

        // Datos que se enviarán a la API
        const paymentDataForAPI = { // Renombrado para claridad
            amount: parsedAmount,
            'card-number': numero_tarjeta,
            cvv: cvv,
            'expiration-month': exp_mes,
            'expiration-year': expirationYear,
            'full-name': nombre_titular,
            currency: moneda,
            description: `Pago por ${servicio} - ${email}`,
            reference: `ORD-${Date.now()}`
        };

        console.log('[PaymentController] Enviando datos a la API:', paymentDataForAPI);

        let paymentStatus: 'pending' | 'completed' | 'failed' = 'failed';
        try {
            const response = await axios.post(`${FAKE_PAYMENT_API_URL}/payments`, paymentDataForAPI, {
                headers: {
                    'Authorization': `Bearer ${FAKE_PAYMENT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[PaymentController] Respuesta de la API:', response.data);

            const apiResponse = response.data as PaymentAPIResponse;

            if (apiResponse && apiResponse.success) {
                paymentStatus = 'completed';
                req.flash('success', '¡Pago procesado con éxito!');
                res.redirect('/pago/success'); // Redirige a la página de éxito de pago
            } else {
                paymentStatus = 'failed';
                req.flash('error', apiResponse.message || 'El pago fue rechazado. Intenta de nuevo.');
                res.redirect('/pago'); // Redirige de vuelta al formulario con error
            }
        } catch (error: any) {
            paymentStatus = 'failed';
            if (error.response) {
                console.error('[PaymentController] Error de la API (respuesta):', error.response.data);
                req.flash('error', error.response.data.message || 'Error de la API al procesar el pago.');
            } else if (error.request) {
                console.error('[PaymentController] Sin respuesta de la API:', error.request);
                req.flash('error', 'No se recibió respuesta del servicio de pago. Revisa tu conexión.');
            } else {
                console.error('[PaymentController] Error desconocido:', error.message);
                req.flash('error', 'Error interno al procesar el pago.');
            }
            res.redirect('/pago'); // Redirige de vuelta al formulario con error
        } finally {
            // Guarda el registro de pago en tu propia base de datos (independientemente del resultado de la API)
            const paymentDataForDB: PaymentData = {
                service: servicio,
                amount: parsedAmount,
                payment_status: paymentStatus
            };
            this.paymentsModel.addPayment(paymentDataForDB, (err, paymentId) => {
                if (err) {
                    console.error('Error al guardar el pago en la DB local:', err.message);
                    // No redirigimos aquí para no sobrescribir la redirección anterior
                } else {
                    console.log(`Pago guardado en la DB local con ID: ${paymentId}. Estado: ${paymentStatus}`);
                }
            });
        }
    }

    public showPaymentForm(req: Request, res: Response): void {
        res.render('payment_form', {
            pageTitle: 'Realizar Pago',
            successMessage: req.flash('success')[0],
            errorMessage: req.flash('error')[0]
        });
    }

    /**
     * Muestra la tabla de todos los pagos. Esta ruta será protegida.
     */
    public async index(req: Request, res: Response): Promise<void> {
        try {
            this.paymentsModel.getAllPayments((err: Error | null, payments?: Payment[]) => {
                if (err) {
                    console.error('Error al obtener pagos para la tabla:', err.message);
                    req.flash('error', 'No se pudieron cargar los pagos.');
                    res.redirect('/admin/dashboard'); // Redirige a un panel de admin si falla
                } else {
                    res.render('admin/payments_table', { payments: payments || [] }); // Renderiza la nueva vista de tabla
                }
            });
        } catch (error) {
            console.error('Error general al obtener pagos para la tabla:', error);
            req.flash('error', 'Hubo un error inesperado al cargar los pagos.');
            res.redirect('/admin/dashboard');
        }
    }
}

export default PaymentController;
