import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, Application, NextFunction } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import flash from 'connect-flash';

import { authRouter, isAuthenticated, isAdmin } from './routes/authRoutes';
import db from './db/database';

import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';
import { getIpGeolocation } from './services/ipGeolocationService';
import PaymentController from './controllers/PaymentController';

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        username?: string;
        isAdmin?: boolean;
    }
}

const app: Application = express();
app.set('trust proxy', true);

const port = process.env.PORT || 3000;

// --- Middlewares Globales ---
app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_must_be_changed',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
    }
}));

app.use(flash());

app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.isAuthenticated = req.session.userId ? true : false;
    res.locals.username = req.session.username || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    res.locals.messages = req.flash();
    next();
});

// --- Configuración de Vistas EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
console.log('EJS Views Directory configured as:', app.get('views'));

const contactsModel = new ContactsModel(db);
const contactsController = new ContactsController(contactsModel);
const paymentController = new PaymentController();

app.use('/', authRouter);

// Ruta principal
app.get('/', (req: Request, res: Response) => {
    res.render('index', { pageTitle: 'Página Principal' });
});

// Servicios
app.get('/servicios', (req: Request, res: Response) => {
    res.render('servicios');
});

app.post('/contact/add', contactsController.add);
// AÑADIR LA RUTA PROTEGIDA PARA LA TABLA DE CONTACTOS DE NUEVO
app.get('/admin/contacts', isAuthenticated, isAdmin, contactsController.index);
app.get('/contacto', (req: Request, res: Response) => { res.render('contact_form'); });
app.get('/contact/success', (req: Request, res: Response) => { res.render('contact_success'); });

app.post('/payment/process', paymentController.processPayment);
app.get('/pago', paymentController.showPaymentForm);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log(`Modo: ${process.env.NODE_ENV}`);
});
