import express, { Request, Response, NextFunction } from 'express';
import db from '../db/database';
import { hashPassword, comparePassword } from '../utils/authUtils';

const router = express.Router();

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('error', 'Por favor, inicia sesión para acceder a esta página.');
    res.redirect('/login');
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
        db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId], (err, user: { is_admin: number } | undefined) => {
            if (err) {
                console.error('Error al verificar rol de admin:', err.message);
                req.flash('error', 'Error al verificar tus permisos.');
                return res.redirect('/login');
            }
            if (user && user.is_admin === 1) {
                return next();
            } else {
                req.flash('error', 'No tienes permisos de administrador para acceder a esta página.');
                res.status(403).redirect('/');
            }
        });
    } else {
        req.flash('error', 'Por favor, inicia sesión como administrador.');
        res.redirect('/login');
    }
}

router.get('/register', isAdmin, (req: Request, res: Response) => {
    res.render('register', {
        error: req.flash('error')[0],
        success: req.flash('success')[0]
    });
});

router.post('/register', isAdmin, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        req.flash('error', 'Usuario y contraseña son obligatorios.');
        return res.redirect('/register');
    }

    try {
        const hashedPassword = await hashPassword(password);

        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    req.flash('error', 'El nombre de usuario ya existe.');
                } else {
                    console.error('Error al registrar usuario:', err.message);
                    req.flash('error', 'Error al registrar el usuario. Inténtalo de nuevo.');
                }
                return res.redirect('/register');
            }
            console.log(`Usuario ${username} registrado con ID: ${this.lastID}`);
            req.flash('success', 'Usuario registrado exitosamente. Ya puede iniciar sesión.');
            res.redirect('/register');
        });
    } catch (error) {
        console.error('Error en el proceso de registro:', error);
        req.flash('error', 'Error interno del servidor al registrar el usuario.');
        res.redirect('/register');
    }
});

router.get('/login', (req: Request, res: Response) => {
    res.render('login', {
        error: req.flash('error')[0],
        success: req.flash('success')[0]
    });
});

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        req.flash('error', 'Usuario y contraseña son obligatorios.');
        return res.redirect('/login');
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user: any) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            req.flash('error', 'Error interno del servidor. Inténtalo de nuevo.');
            return res.redirect('/login');
        }
        if (!user) {
            req.flash('error', 'Usuario o contraseña incorrectos.');
            return res.redirect('/login');
        }

        const match = await comparePassword(password, user.password_hash);

        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.isAdmin = user.is_admin === 1;
            req.flash('success', `Bienvenido, ${user.username}!`);
            console.log(`Usuario ${user.username} (ID: ${user.id}, Admin: ${req.session.isAdmin}) inició sesión.`);

            if (req.session.isAdmin) {
                res.redirect('/admin/contacts'); // Redirige al admin directamente a la tabla de contactos
            } else {
                res.redirect('/');
            }
        } else {
            req.flash('error', 'Usuario o contraseña incorrectos.');
            res.redirect('/login');
        }
    });
});

router.get('/logout', (req: Request, res: Response) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            req.flash('error', 'Error al cerrar sesión. Inténtalo de nuevo.');
        } else {
            res.clearCookie('connect.sid');
            req.flash('success', 'Has cerrado sesión exitosamente.');
        }
        res.redirect('/login');
    });
});

router.get('/admin/dashboard', isAuthenticated, isAdmin, (req: Request, res: Response) => {
    res.send(`
        <h1>Bienvenido al Dashboard de Administrador, ${req.session.username}!</h1>
        <p>Tu ID de usuario es: ${req.session.userId}</p>
        <p>Eres administrador: ${req.session.isAdmin ? 'Sí' : 'No'}</p>
        <p>Esta es una página de ejemplo para administradores.</p>
        <p><a href="/logout">Cerrar sesión</a></p>
        <p><a href="/">Volver a la página principal</a></p>
    `);
});

export { router as authRouter };
