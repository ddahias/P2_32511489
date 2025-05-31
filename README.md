# #AraguaSports #Cyclists #Kayaks

## Descripción del proyecto
Este proyecto es una aplicación web de alquiler de equipo deportivo y rutas turísticas en Puerto Colombia. Su objetivo es facilitar la reserva de equipos como bicicletas y kayaks, tambien servicios de rutas guiadas, ofreciendo una experiencia de usuario divertida y segura.

## Características principales

* **Alquiler de Equipo Deportivo:** Variedad de bicicletas y kayaks disponibles para alquiler.
* **Rutas Turísticas:** Rutas guiadas en la zona de Puerto Colombia.
* **Formulario de Contacto:** Para que los usuarios puedan comunicarse con nosotros por alguna duda.
* **Formulario de Pagos:** Integración con una API de pago simulada para procesar pagos.
* **Diseño Responsivo:** Adaptado para una visualización en diferentes dispositivos (telefonos móvil, laptops,pc de mesa).

## Funcionalidades y Servicios Integrados

### 1. **Geolocalización por IP**
* **Servicio:** Se utilizo una API de geolocalización ( `ipapi.co` ) para identificar el país del usuario que completo el formulario de contacto.
* **Implementación:** La dirección IP del usuario se captura en el backend al momento del envío del formulario. Se realiza una solicitud a la API externa para obtener el país, el cual es luego almacenado en la base de datos junto con los demás datos del formulario.

### 2. **Google Analytics**
* **Objetivo:** Recopilar estadísticas de visitas y analizar el comportamiento de los usuarios en el pagina web.
* **Implementación:** El código de seguimiento de Google Analytics (`gtag.js`) está integrado en todas las páginas del proyecto. Se configuran eventos para rastrear interacciones clave y obtener información valiosa sobre el uso de la aplicación.

### 3. **Google reCAPTCHA v2**
* **Objetivo:** Tener seguridad en el formulario de contacto contra bots y spam.
* **Implementación:** El widget de reCAPTCHA se ha integrado en el formulario de contacto del frontend. Antes de procesar los datos enviados, se realiza una validación, enviando la respuesta del reCAPTCHA a los servidores de Google para su verificación.
* **Configuración:** Requiere una **clave de sitio** (pública) en el frontend y una **clave secreta** (privada) en el backend, ambas almacenadas como variables de entorno.

### 4. **Notificación por Correo Electrónico**
* **Objetivo:** Enviar una confirmación y detalles del formulario a los administradores del sitio.
* **Implementación:** Cada vez que un usuario completa y envía exitosamente el formulario de contacto, se envia un correo electrónico utilizando `Nodemailer` (la librería).
* **Contenido del Correo:** Incluye el nombre del usuario, correo electrónico, comentario, dirección IP, país de origen y la fecha/hora de la solicitud.
* **Credenciales:** Las credenciales del servidor de correo electrónico (usuario y contraseña/token) están almacenadas de forma segura como variables de entorno.

### 5. **Integración con Fake Payment API**
* **Servicio:** Se utiliza la API de pago simulada `https://fakepayment.onrender.com/` para procesar los pagos del formulario.
* **Implementación:** Al enviar el formulario de pagos, los datos son enviados al backend, que a su vez se comunica con la Fake Payment API. Dependiendo de la respuesta de la API, el usuario es redirigido a una página de "¡Pago Realizado con Éxito!" o de "Error de Pago".

### 6. **Seguridad (Variables de Entorno)**
* **Implementación:** Todas las credenciales y claves del proyecto (Token privado de Google reCAPTCHA, claves del de correo electrónico.) se almacenan como **variables de entorno**.
* **Protección:** Estas variables no están directamente en el código ni en el repositorio de Git. Se utiliza un archivo `.env` , y este archivo está incluido en el `.gitignore` para asegurar que no se suba a GitHub. Para el despliegue en Render, las variables se configuran directamente en la interfaz de Render.
