import bcrypt from 'bcrypt';

const saltRounds = 10; 

 export async function hashPassword(password: string): Promise<string> {
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('Error al hashear la contraseña:', error);
        throw error; 
    }
}
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        console.error('Error al comparar la contraseña:', error);
        throw error; 
    }
}
