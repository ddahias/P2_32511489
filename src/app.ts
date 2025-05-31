import express, { Request, Response, Application } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import session from 'express-session';
import flash from 'connect-flash';

import ContactsController from './controllers/ContactsController';
import ContactsModel from './models/ContactsModel';

const app: Application = express();
app.set('trust proxy', true);
const port = 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use('/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'tu-cadena-secreta-cambiala-en-produccion-12345abc', 
    resave: false, 
    saveUninitialized: true 
}));
app.use(flash());

const db = new sqlite3.Database('./database.db', (err: Error | null) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');

        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, '../views'));
        console.log('EJS Views Directory configured as:', app.get('views'));

        const contactsModel = new ContactsModel(db);
        const contactsController = new ContactsController(contactsModel);

        //menu
        app.get('/', (req: Request, res: Response) => {res.render('index');});
        
        //servicios
        app.get('/servicios', (req: Request, res: Response) => {res.render('servicios');});
        
        //formulario de contacto
        app.post('/contact/add', contactsController.add);
        app.get('/admin/contacts', contactsController.index);
        app.get('/contacto', (req: Request, res: Response) => {res.render('contact_form');});
        app.get('/contact/success', (req: Request, res: Response) => {res.render('contact_success');});
        
        //formulario de pago
        app.get('/payment', (req: Request, res: Response) => {res.render('payment_form');});
        app.get('/payment/success', (req: Request, res: Response) => {res.render('payment_success');});

        app.listen(port, () => {
            console.log(`Servidor corriendo en http://localhost:${port}`);
        });
    }
});
