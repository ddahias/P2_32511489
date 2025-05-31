import { Request, Response } from 'express';
import axios from 'axios';

const FAKE_PAYMENT_API_URL = 'https://fakepayment.onrender.com';
const FAKE_PAYMENT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiZmFrZSBwYXltZW50IiwiZGF0ZSI6IjIwMjUtMDUtMjlUMTk6MzY6MjEuMzkyWiIsImlhdCI6MTc0ODU0NzM4MX0.cJN59porfYQNGij1dOJXvb7YFzyoFu9GsdOTWe6kukw';

interface PaymentAPIResponse {
    success: boolean;
    message?: string;
    [key: string]: any;
}

class PaymentController {
    public async processPayment(req: Request, res: Response): Promise<void> {
        const { monto, moneda, email, nombre_titular, numero_tarjeta, exp_mes, exp_anio, cvv, servicio } = req.body;

        // Validación básica
        if (!monto || !moneda || !email || !nombre_titular || !numero_tarjeta || !exp_mes || !exp_anio || !cvv) {
            console.log('[PaymentController] Faltan campos requeridos:', req.body);
            return res.render('payment_failure', {
                pageTitle: 'Error de Pago',
                errorMessage: 'Por favor, completa todos los campos requeridos.'
            });
        }

        const parsedAmount = parseFloat(monto);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.log('[PaymentController] Monto inválido:', monto);
            return res.render('payment_failure', {
                pageTitle: 'Error de Pago',
                errorMessage: 'El monto del pago es inválido.'
            });
        }

        // Convierte el año a formato completo si tiene solo 2 dígitos
        let expirationYear = exp_anio;
        if (expirationYear.length === 2) {
            expirationYear = '20' + expirationYear;
        }

        // Datos que se enviarán a la API
        const paymentData = {
            amount: parsedAmount,
            'card-number': numero_tarjeta,
            cvv: cvv,
            'expiration-month': exp_mes,
            'expiration-year': expirationYear,
            'full-name': nombre_titular,
            currency: moneda,
            description: `Pago por ${servicio || 'servicio'} - ${email}`,
            reference: `ORD-${Date.now()}`
        };

        console.log('[PaymentController] Enviando datos a la API:', paymentData);

        try {
            const response = await axios.post(`${FAKE_PAYMENT_API_URL}/payments`, paymentData, {
                headers: {
                    'Authorization': `Bearer ${FAKE_PAYMENT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[PaymentController] Respuesta de la API:', response.data);

            const data = response.data as PaymentAPIResponse;

            if (data && data.success) {
                res.render('payment_success', {
                    pageTitle: 'Pago Exitoso'
                });
            } else {
                res.render('payment_failure', {
                    pageTitle: 'Error de Pago',
                    errorMessage: data.message || 'El pago fue rechazado. Intenta de nuevo.'
                });
            }
        } catch (error: any) {
            if (error.response) {
                console.log('[PaymentController] Error de la API:', error.response.data);
            } else if (error.request) {
                console.log('[PaymentController] Sin respuesta de la API:', error.request);
            } else {
                console.log('[PaymentController] Error desconocido:', error.message);
            }
            let errorMessage = 'Error al procesar el pago.';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            res.render('payment_failure', {
                pageTitle: 'Error del Sistema',
                errorMessage
            });
        }
    }

    public showPaymentForm(req: Request, res: Response): void {
        res.render('payment_form', { pageTitle: 'Realizar Pago' });
    }
}

export default PaymentController;