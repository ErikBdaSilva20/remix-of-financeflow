// Mesma normalização usada nos índices únicos de customers/vendors em setup.sql
// (lower() pro e-mail, só dígitos pro celular) — precisa bater exatamente pra
// o aviso no formulário e a constraint do banco concordarem.
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

interface Contactable {
  id: string;
  email?: string | null;
  phone?: string | null;
}

/** Encontra um registro existente com o mesmo e-mail ou celular (ignora o próprio registro ao editar). */
export function findDuplicateBy<T extends Contactable>(
  rows: T[],
  { email, phone }: { email?: string | null; phone?: string | null },
  excludeId?: string
): { field: 'email' | 'phone'; row: T } | null {
  const normEmail = email ? normalizeEmail(email) : null;
  const normPhone = phone ? normalizePhone(phone) : null;

  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    if (normEmail && row.email && normalizeEmail(row.email) === normEmail) {
      return { field: 'email', row };
    }
    if (normPhone && row.phone && normalizePhone(row.phone) === normPhone) {
      return { field: 'phone', row };
    }
  }
  return null;
}
