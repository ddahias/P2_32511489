import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import db from '../db/database'; 
import * as sqlite3 from 'sqlite3';

dotenv.config(); 

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser((id: number, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err: Error | null, user: any) => {
        if (err) {
            return done(err);
        }
        done(null, user); 
    });
});
//passport.setup.ts
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
        scope: ['profile', 'email'] // Solicita acceso al perfil y al correo electrónico del usuario
    },
    (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {

        console.log('Perfil de Google recibido:', profile);
        console.log('ID de Google:', profile.id);
        console.log('Email de Google:', profile.emails && profile.emails[0] ? profile.emails[0].value : 'No disponible');
        console.log('Nombre de Google:', profile.displayName);

        db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err: Error | null, currentUser: any) => {
            if (err) {
                console.error('Error al buscar usuario por google_id:', err.message);
                return done(err);
            }

            if (currentUser) {
                console.log('Usuario ya registrado:', currentUser.username);
                return done(null, currentUser); // Pasa el usuario existente a Passport
            } else {
                const newUserEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                const newUserName = profile.displayName || newUserEmail; 

                if (newUserEmail) {
                    db.get('SELECT * FROM users WHERE email = ?', [newUserEmail], (err: Error | null, existingUserWithEmail: any) => {
                        if (err) {
                            console.error('Error al buscar usuario por email:', err.message);
                            return done(err);
                        }
                        if (existingUserWithEmail) {
                            console.warn('Usuario existente con el mismo email, pero sin google_id. Considera enlazar cuentas.');
                            // Aquí podrías actualizar el google_id del usuario existente
                            db.run('UPDATE users SET google_id = ? WHERE id = ?', [profile.id, existingUserWithEmail.id], (updateErr: Error | null) => {
                                if (updateErr) {
                                    console.error('Error al actualizar google_id de usuario existente:', updateErr.message);
                                    return done(updateErr);
                                }
                                console.log('Google ID enlazado a usuario existente:', existingUserWithEmail.username);
                                return done(null, { ...existingUserWithEmail, google_id: profile.id }); // Devuelve el usuario actualizado
                            });
                        } else {
                            // Crea el nuevo usuario de Google
                            db.run('INSERT INTO users (username, google_id, email, is_admin) VALUES (?, ?, ?, 0)',
                                [newUserName, profile.id, newUserEmail],
                                function(this: sqlite3.RunResult, insertErr: Error | null) {
                                    if (insertErr) {
                                        console.error('Error al crear nuevo usuario de Google:', insertErr.message);
                                        return done(insertErr);
                                    }
                                    // Recupera el usuario recién creado para pasarlo a Passport
                                    db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (getErr: Error | null, createdUser: any) => {
                                        if (getErr) {
                                            console.error('Error al recuperar nuevo usuario de Google:', getErr.message);
                                            return done(getErr);
                                        }
                                        console.log('Nuevo usuario de Google creado:', createdUser.username);
                                        return done(null, createdUser);
                                    });
                                }
                            );
                        }
                    });
                } else {
                    // Si el email de Google no está disponible, crear un usuario con el google_id y un nombre
                    db.run('INSERT INTO users (username, google_id, is_admin) VALUES (?, ?, 0)',
                        [newUserName, profile.id],
                        function(this: sqlite3.RunResult, insertErr: Error | null) {
                            if (insertErr) {
                                console.error('Error al crear nuevo usuario de Google (sin email):', insertErr.message);
                                return done(insertErr);
                            }
                            db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (getErr: Error | null, createdUser: any) => {
                                if (getErr) {
                                    console.error('Error al recuperar nuevo usuario de Google (sin email):', getErr.message);
                                    return done(getErr);
                                }
                                console.log('Nuevo usuario de Google creado (sin email):', createdUser.username);
                                return done(null, createdUser);
                            });
                        }
                    );
                }
            }
        });
    })
);
