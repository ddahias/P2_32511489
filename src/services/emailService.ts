import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer'; 

interface ContactEmailData {
    name: string;
    email: string;
    comment?: string;
    ip_address?: string;
    country?: string;
    timestamp: string; 
}

let transporter: Transporter;

const initializeEmailTransporter = () => {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('ERROR: Las variables de entorno para el correo electrónico no están completamente configuradas.');
        return;
    }

    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT as string), 
        secure: false, 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        logger: true,
        debug: true,
    });

    transporter.verify(function (error, success) {
        if (error) {
            console.error('Error al verificar la conexión de Nodemailer:', error);
        } else {
            console.log('Servidor de Nodemailer listo para enviar mensajes.');
        }
    });
};

initializeEmailTransporter();
// Función para enviar el correo
export const sendContactEmail = async (data: ContactEmailData) => {
    if (!transporter) {
        console.error('ERROR: Nodemailer transporter no está inicializado.');
        return;
    }

            const emailFrom = process.env.EMAIL_FROM_NAME
            ? `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`
            : process.env.EMAIL_USER;
             const emailTo = process.env.EMAIL_TO || 'programacion2ais@yopmail.com, 32511489opsu@gmail.com'; // Usa yopmail.com si no hay destinatario configurado
    

        const mailOptions = {
            from: emailFrom,
            to: emailTo,
            subject: 'Nuevo Mensaje de Contacto en tu Sitio Web',
            html: `
            <h2>Detalles del Nuevo Mensaje</h2>
            <p><strong>Nombre:</strong> ${data.name}</p>
            <p><strong>Correo Electrónico:</strong> ${data.email}</p>
            <p><strong>Comentario:</strong> ${data.comment || 'N/A'}</p>
            <p><strong>IP del Usuario:</strong> ${data.ip_address || 'Desconocida'}</p>
            <p><strong>País (Geolocalización):</strong> ${data.country || 'N/A'}</p>
            <p><strong>Fecha y Hora:</strong> ${data.timestamp}</p>
            <br>
            <p>Este mensaje fue enviado a través del formulario de contacto de tu sitio web.</p>
        `,
        text: `Nuevo Mensaje de Contacto:\nNombre: ${data.name}\nCorreo: ${data.email}\nComentario: ${data.comment || 'N/A'}\nIP: ${data.ip_address || 'Desconocida'}\nPaís: ${data.country || 'N/A'}\nFecha: ${data.timestamp}`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: %s', info.messageId);
        console.log('URL de vista previa: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error al enviar el correo de contacto:', error);
    }
};