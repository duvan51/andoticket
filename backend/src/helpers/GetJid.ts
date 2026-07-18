export const getJid = (number: string): string => {
  if (!number) return "";
  if (number.includes("@")) return number;
  // Si el número comienza con '1' y tiene 15 o más dígitos, es un LID de WhatsApp
  if (number.startsWith("1") && number.length >= 15) {
    return `${number}@lid`;
  }
  return `${number}@c.us`;
};
