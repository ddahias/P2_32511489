import fetch from 'node-fetch';


interface IpapiResponse {
  ip?: string;
  country_name?: string;
  city?: string;
  region?: string;
  org?: string; 
  latitude?: number;
  longitude?: number;
  error?: boolean; 
  reason?: string; 
}

/**
 * @param ipAddress La dirección IP a geolocalizar. Si es undefined o vacío, se usará la IP de la solicitud.
 * @returns Una Promesa que resuelve con los datos de geolocalización (IpapiResponse) o null si hay un error.
 */
export async function getIpGeolocation(ipAddress?: string): Promise<IpapiResponse | null> {
  const apiUrl = `https://ipapi.co/${ipAddress || ''}/json/`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error HTTP de ipapi.co: ${response.status} - ${response.statusText}. Respuesta: ${errorText}`);
      throw new Error(`Error al obtener datos de IP: ${response.status}`);
    }

    const data = await response.json() as IpapiResponse;

    if (data && data.error) {
        console.error(`Error reportado por la API ipapi.co: ${data.reason}`);
        return null; 
    }

    return data; // Devuelve los datos de geolocalización exitosos
  } catch (error: any) {
    console.error('Hubo un problema con la petición fetch para geolocalización:', error.message);
    return null; 
  }
}