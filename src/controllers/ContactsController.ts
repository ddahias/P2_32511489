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
        this.index = this.index.bind(this);
        this.showContactForm = this.showContactForm.bind(this);
    }

    showContactForm(req: Request, res: Response): void {
        const successMessages = req.flash('success');
        const errorMessages = req.flash('error');
        res.render('contact_form', {
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
            req.flash('error', 'Por favor, completa la verificación reCAPTCHA.');
            return res.redirect('/contacto');
        }

        try {
            const secretKey = process.env.RECAPTCHA_SECRET_KEY;

            if (!secretKey) {
                console.error('ERROR: La variable de entorno RECAPI_SECRET_KEY no está definida.');
                req.flash('error', 'Hubo un error de configuración del servidor. Intenta de nuevo más tarde.');
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
                req.flash('error', 'Fallo en la verificación reCAPTCHA. Intenta de nuevo.');
                return res.redirect('/contacto');
            }
            console.log('reCAPTCHA: Verificación exitosa.');

        } catch (recaptchaError) {
            console.error('Error al verificar reCAPTCHA:', recaptchaError);
            req.flash('error', 'Hubo un error al verificar reCAPTCHA. Intenta de nuevo.');
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

        // Envuelve la llamada a addContact en una promesa para usar await
        try {
            const result = await new Promise<{ id?: number, error?: string }>((resolve, reject) => {
                this.contactsModel.addContact(contactData, (err: Error | null, contactId?: number) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: contactId });
                    }
                });
            });

            console.log('Callback de addContact del modelo ejecutado');
            console.log(`Contacto guardado con ID: ${result.id}, IP: ${ipAddress}, País: ${country}`);
            req.flash('success', '¡Tu mensaje ha sido enviado con éxito!');
            
            const timestamp = new Date().toLocaleString();

            // Intenta enviar el correo
            try {
                await sendContactEmail({
                    name: contactData.name,
                    email: contactData.email,
                    comment: contactData.comment,
                    ip_address: contactData.ip_address,
                    country: contactData.country,
                    timestamp: timestamp
                });
                console.log('Correo de contacto enviado con éxito.');
            } catch (emailError) {
                console.error('Error al enviar el correo de contacto:', emailError);
                // No detenemos la respuesta, solo registramos el error
            }

            res.redirect('/contact/success');
        } catch (err: any) { // Captura errores de addContact y geolocalización
            console.error('Error al procesar el contacto:', err.message);
            req.flash('error', 'Hubo un error al guardar tu mensaje. Intenta de nuevo.');
            res.redirect('/contacto');
        }
    }

    public async index(req: Request, res: Response): Promise<void> {
        try {
            this.contactsModel.getAllContacts((err: Error | null, contacts?: Contact[]) => {
                if (err) {
                    console.error('Error al obtener contactos para la tabla:', err.message);
                    req.flash('error', 'No se pudieron cargar los contactos.');
                    res.redirect('/admin/dashboard');
                } else {
                    res.render('admin/contacts_table', { contacts: contacts || [] });
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
