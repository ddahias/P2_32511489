import { Request, Response, RequestHandler } from 'express';
import ContactsModel, { ContactData, Contact } from '../models/ContactsModel';
import { getIpGeolocation } from '../services/ipGeolocationService';
import nodeFetch, {RequestInfo, RequestInit, Response as FetchResponse } from 'node-fetch';
import { sendContactEmail } from '../services/emailService';

interface RecaptchaVerificationResponse {
    success: boolean;
    challenge_ts: string;
    hostname: string;
    'error-codes'?: string[];
}

class ContactsController {
    private contactsModel: ContactsModel;

    constructor(contactsModel: ContactsModel) {
        this.contactsModel = contactsModel;
        this.add = this.add.bind(this);
        this.index = this.index.bind(this); // Asegura que 'this' se mantenga en los métodos de Express
        this.showContactForm = this.showContactForm.bind(this);
    }

    showContactForm(req: Request, res: Response): void {
        const successMessages = req.flash('success');
        const errorMessages = req.flash('error');
        res.render('contact_form', { // Asegúrate de que este es el nombre correcto de tu vista de formulario de contacto
            pageTitle: 'Contacto Ciclexpress',
            successMessage: successMessages.length > 0 ? successMessages[0] : null,
            errorMessage: errorMessages.length > 0 ? errorMessages[0] : null
        });
    }

    public async add(req: Request, res: Response): Promise<void> {
        const { name, email, comment, 'g-recaptcha-response': recaptchaResponse } = req.body;
        const ipAddress = req.ip;
        let country = 'Desconocido';
        
        console.log('add empezado en ContactsController');
        
        if (!recaptchaResponse) {
            console.warn('reCAPTCHA: No se recibió la respuesta de reCAPTCHA.');
            (req.flash as any)('error', 'Por favor, completa la verificación reCAPTCHA.');
            return res.redirect('/contacto');
        }

        try {
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;

            if (!secretKey) {
                console.error('ERROR: La variable de entorno RECAPI_SECRET_KEY no está definida.');
                (req.flash as any)('error', 'Hubo un error de configuración del servidor. Intenta de nuevo más tarde.');
                return res.redirect('/contacto');
            }

            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}&remoteip=${ipAddress}`;

            const fetchImplementation = async (...args: [RequestInfo, RequestInit?]): Promise<FetchResponse> => {
                const { default: nodeFetch } = await import('node-fetch');
                return nodeFetch(...args);
            };

            const recaptchaRes = await fetchImplementation(verificationUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const recaptchaData = await recaptchaRes.json() as RecaptchaVerificationResponse;

            if (!recaptchaData.success) {
                console.warn('reCAPTCHA: Verificación fallida.', recaptchaData['error-codes']);
                (req.flash as any)('error', 'Fallo en la verificación reCAPTCHA. Intenta de nuevo.');
                return res.redirect('/contacto');
            }
            console.log('reCAPTCHA: Verificación exitosa.');

        } catch (recaptchaError) {
            console.error('Error al verificar reCAPTCHA:', recaptchaError);
            (req.flash as any)('error', 'Hubo un error al verificar reCAPTCHA. Intenta de nuevo.');
            return res.redirect('/contacto');
        }

        try {
            const geoInfo = await getIpGeolocation(ipAddress);
            if (geoInfo && geoInfo.country_name) {
                country = geoInfo.country_name;
                console.log(`IP ${ipAddress} geolocalizada a País: ${country}`);
            } else {
                console.warn(`No se pudo obtener información de país para IP: ${ipAddress}`);
            }
        } catch (geoError) {
            console.error('Error al obtener geolocalización en ContactsController:', geoError);
        }

        const contactData: ContactData = {
            name: name,
            email: email,
            comment: comment,
            ip_address: ipAddress,
            country: country,
        };
        
        console.log('contactData FINAL para el modelo:', contactData);

        this.contactsModel.addContact(contactData, (err: Error | null, contactId?: number) => {
            console.log('Callback de addContact del modelo ejecutado');
            if (err) {
                console.error('Error al insertar contacto:', err.message);
                (req.flash as any)('error', 'Hubo un error al guardar tu mensaje. Intenta de nuevo.');
            } else {
                console.log(`Contacto guardado con ID: ${contactId}, IP: ${ipAddress}, País: ${country}`);
                (req.flash as any)('success', '¡Tu mensaje ha sido enviado con éxito!');
        
                const timestamp = new Date().toLocaleString();

                sendContactEmail({
                    name: contactData.name,
                    email: contactData.email,
                    comment: contactData.comment,
                    ip_address: contactData.ip_address,
                    country: contactData.country,
                    timestamp: timestamp
                });
            }
            res.redirect('/contact/success');
        });
        console.log('add terminado en ContactsController (pero el callback aún pendiente)');
    }

    /**
     * Muestra la tabla de todos los contactos. Esta ruta es protegida.
     */
    public async index(req: Request, res: Response): Promise<void> {
        try {
            // Utiliza un callback en getAllContacts como está definido en tu modelo actual
            this.contactsModel.getAllContacts((err: Error | null, contacts?: Contact[]) => {
                if (err) {
                    console.error('Error al obtener contactos para la tabla:', err.message);
                    req.flash('error', 'No se pudieron cargar los contactos.');
                    // Asegúrate de que 'admin_dashboard' existe o redirige a la raíz
                    res.redirect('/admin/dashboard'); 
                } else {
                    res.render('admin/contacts_table', { contacts: contacts || [] }); // Asegura que siempre sea un array
                }
            });
        } catch (error) {
            console.error('Error general al obtener contactos para la tabla:', error);
            req.flash('error', 'Hubo un error inesperado al cargar los contactos.');
            res.redirect('/admin/dashboard');
        }
    }
}
export default ContactsController;
