
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, Application, NextFunction } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';

// Importaciones de tu configuración actual
import { authRouter, isAuthenticated, isAdmin } from './routes/authRoutes';
import db from './db/database';
import './config/passport-setup';

// Tus controladores y modelos existentes
import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';
import { getIpGeolocation } from './services/ipGeolocationService';
import PaymentController from './controllers/PaymentController';
import PaymentsModel from './models/PaymentsModel'; // Importa el modelo de pagos

// DECLARACIÓN PARA EXTENDER EL TIPO DE SESIÓN EN EXPRESS (IMPORTANTE PARA Passport también)
declare module 'express-session' {
    interface SessionData {
        userId?: number;
        username?: string;
        isAdmin?: boolean;
        passport?: { user: number };
    }
}
declare global {
    namespace Express {
        interface User {
            id: number;
            username?: string;
            google_id?: string;
            email?: string;
            is_admin?: number;
        }
    }
}


const app: Application = express();
app.set('trust proxy', true);

const port = process.env.PORT || 3000;


// Middlewares Globales
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración de express-session (DEBE IR ANTES DE passport.session()!)
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_must_be_changed',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15, // 15 min
    }
}));

app.use(flash());

// Inicializar Passport y usar su middleware de sesión (DESPUÉS de express-session)
app.use(passport.initialize());
app.use(passport.session());


// Middleware para EJS (hace el estado de autenticación y mensajes flash disponibles en todas las vistas)
app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.isAuthenticated = (req.isAuthenticated && req.isAuthenticated()) || (req.session && req.session.userId) ? true : false;
    res.locals.username = (req.user && req.user.username) || req.session.username || null;
    res.locals.isAdmin = (req.user && req.user.is_admin === 1) || (req.session && req.session.isAdmin) || false;
    res.locals.messages = req.flash();
    next();
});


// Configuración de Vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
console.log('EJS Views Directory configured as:', app.get('views'));


// Instanciación de Controladores y Modelos
const contactsModel = new ContactsModel(db);
const contactsController = new ContactsController(contactsModel);

const paymentsModel = new PaymentsModel(db); // Instancia el modelo de pagos
const paymentController = new PaymentController(paymentsModel); // Pasa el modelo al controlador de pagos


// Rutas de la Aplicación
app.use('/', authRouter); // Monta el router de autenticación

// Ruta principal (Metadatos Open Graph AÑADIDOS)
app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        pageTitle: 'Alquiler de Equipo Deportivo - Tu Aventura Comienza Aquí',
        ogTitle: 'Alquiler de Equipo Deportivo | Bicicletas y Kayaks',
        ogDescription: 'Descubre el mejor equipo para tus aventuras en Puerto Colombia. Bicicletas, kayaks y rutas turísticas.',
        ogImage: 'https://placehold.co/1200x630/005f73/FFFFFF?text=EquipoDeportivo',
        ogUrl: process.env.SITE_URL || 'http://localhost:3000/',
        ogType: 'website',
        ogSiteName: 'Alquiler de Equipo Deportivo',
    });
});

// Servicios
app.get('/servicios', (req: Request, res: Response) => {
    res.render('servicios', {
        pageTitle: 'Nuestros Servicios - Alquiler de Equipo Deportivo',
        ogTitle: 'Servicios | Alquiler de Bicicletas y Kayaks',
        ogDescription: 'Explora nuestra gama de servicios de alquiler y tours guiados para tu próxima aventura.',
        ogImage: 'https://placehold.co/1200x630/09738a/FFFFFF?text=NuestrosServicios',
        ogUrl: process.env.SITE_URL ? `${process.env.SITE_URL}/servicios` : 'http://localhost:3000/servicios',
        ogType: 'website',
        ogSiteName: 'Alquiler de Equipo Deportivo',
    });
});

// Formulario de Contacto (Metadatos Open Graph AÑADIDOS)
app.get('/contacto', (req: Request, res: Response) => {
    const successMessages = req.flash('success');
    const errorMessages = req.flash('error');
    res.render('contact_form', {
        pageTitle: 'Contacto - Alquiler de Equipo Deportivo',
        successMessage: successMessages.length > 0 ? successMessages[0] : null,
        errorMessage: errorMessages.length > 0 ? errorMessages[0] : null,
        ogTitle: 'Contacto | Alquiler de Equipo Deportivo',
        ogDescription: 'Envíanos un mensaje con tus dudas o para reservar equipo. ¡Estamos listos para ayudarte!',
        ogImage: 'https://placehold.co/1200x630/78a890/FFFFFF?text=Contactanos',
        ogUrl: process.env.SITE_URL ? `${process.env.SITE_URL}/contacto` : 'http://localhost:3000/contacto',
        ogType: 'website',
        ogSiteName: 'Alquiler de Equipo Deportivo',
    });
});

app.post('/contact/add', contactsController.add);
app.get('/admin/contacts', isAuthenticated, isAdmin, contactsController.index);
app.get('/contact/success', (req: Request, res: Response) => { res.render('contact_success'); });

// Rutas de Pagos
app.post('/payment/process', paymentController.processPayment);
app.get('/pago', paymentController.showPaymentForm);
app.get('/pago/success', (req: Request, res: Response) => { res.render('payment_success'); }); // Nueva ruta de éxito de pago
app.get('/pago/failure', (req: Request, res: Response) => { res.render('payment_failure'); }); // Nueva ruta de fallo de pago
app.get('/admin/payments', isAuthenticated, isAdmin, paymentController.index); // ¡NUEVA RUTA PROTEGIDA PARA LA TABLA DE PAGOS!


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo: ${process.env.NODE_ENV}`);
});
